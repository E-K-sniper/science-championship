import db from './db.js';
import { hashPassword } from './auth.js';
import { STATIONS, GAMES, BADGES, DEFAULT_SETTINGS, DEMO_TEACHER, DEMO_CLASS, DEMO_STUDENTS } from './seed/content.js';

function seed() {
  const tx = db.transaction(() => {
    // Academic year
    db.prepare("INSERT OR IGNORE INTO academic_years (year, is_current) VALUES ('1448هـ', 1)").run();

    // Settings
    const upsertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) upsertSetting.run(k, JSON.stringify(v));

    // Teacher (idempotent)
    let teacher = db.prepare('SELECT id FROM users WHERE email=?').get(DEMO_TEACHER.email);
    if (!teacher) {
      const info = db.prepare("INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, 'teacher')")
        .run(DEMO_TEACHER.email, hashPassword(DEMO_TEACHER.password), DEMO_TEACHER.name);
      teacher = { id: info.lastInsertRowid };
    }

    // Class
    let cls = db.prepare('SELECT id FROM classes WHERE name=?').get(DEMO_CLASS.name);
    if (!cls) {
      const info = db.prepare('INSERT INTO classes (name, grade, academic_year) VALUES (?,?,?)')
        .run(DEMO_CLASS.name, DEMO_CLASS.grade, '1448هـ');
      cls = { id: info.lastInsertRowid };
    }

    // Demo students
    const insStudent = db.prepare("INSERT INTO users (email, password_hash, display_name, role, class_id) VALUES (?, ?, ?, 'student', ?)");
    for (const s of DEMO_STUDENTS) {
      if (!db.prepare('SELECT id FROM users WHERE email=?').get(s.email)) {
        insStudent.run(s.email, hashPassword(s.password), s.name, cls.id);
      }
    }

    // Stations + content + questions
    const stationIds = {};
    for (const st of STATIONS) {
      let row = db.prepare('SELECT id FROM stations WHERE slug=?').get(st.slug);
      if (!row) {
        const info = db.prepare(`INSERT INTO stations (order_index, slug, title_ar, title_en, description_ar, objectives_ar, outcomes_ar, strategy, color, icon, mastery_threshold)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
          st.order, st.slug, st.title_ar, st.title_en, st.description_ar, st.objectives_ar, st.outcomes_ar, st.strategy, st.color, st.icon, 80);
        row = { id: info.lastInsertRowid };
      }
      stationIds[st.slug] = row.id;
      const sid = row.id;

      if (!db.prepare('SELECT id FROM lessons WHERE station_id=?').get(sid)) {
        db.prepare('INSERT INTO lessons (station_id, title_ar, content_ar, order_index) VALUES (?,?,?,0)')
          .run(sid, st.lesson_title, st.lesson_body);
      }
      if (!db.prepare('SELECT id FROM activities WHERE station_id=?').get(sid)) {
        db.prepare('INSERT INTO activities (station_id, type, title_ar, config, points, order_index) VALUES (?,?,?,?,?,0)')
          .run(sid, st.activity.type, st.activity.title_ar, JSON.stringify(st.activity.config), 20);
      }
      if (!db.prepare('SELECT id FROM experiments WHERE station_id=?').get(sid)) {
        const e = st.experiment;
        db.prepare('INSERT INTO experiments (station_id, title_ar, objective_ar, materials_ar, instructions_ar, explanation_ar, config, points) VALUES (?,?,?,?,?,?,?,?)')
          .run(sid, e.title_ar, e.objective_ar, e.materials_ar, e.instructions_ar, e.explanation_ar, JSON.stringify(e.config), 30);
      }

      // questions
      const qCount = db.prepare('SELECT COUNT(*) c FROM questions WHERE station_id=?').get(sid).c;
      if (qCount === 0) {
        const insQ = db.prepare(`INSERT INTO questions (station_id, domain, outcome, difficulty, type, text_ar, explanation_ar, source, review_status, created_by)
          VALUES (?,?,?,?,?,?,?,?,?,?)`);
        const insO = db.prepare('INSERT INTO question_options (question_id, text_ar, is_correct, order_index) VALUES (?,?,?,?)');
        const outcomes = st.outcomes_ar.split('\n');
        st.questions.forEach((q, qi) => {
          const [text, opts, correct, expl, outcomeIdx] = q;
          const info = insQ.run(sid, st.title_ar, outcomes[outcomeIdx] || null, 2, 'multiple_choice',
            text, expl, 'seed', 'approved', teacher.id);
          opts.forEach((o, i) => insO.run(info.lastInsertRowid, o, i === correct ? 1 : 0, i));
        });
      }
    }

    // Games
    for (const g of GAMES) {
      if (!db.prepare('SELECT id FROM games WHERE slug=?').get(g.slug)) {
        db.prepare('INSERT INTO games (slug, title_ar, title_en, description_ar, instructions_ar, config, points, order_index) VALUES (?,?,?,?,?,?,?,?)')
          .run(g.slug, g.title_ar, g.title_en, g.description_ar, g.instructions_ar, '{}', g.points, g.order);
      }
    }

    // Badges
    for (const b of BADGES) {
      db.prepare('INSERT OR IGNORE INTO badges (slug, title_ar, title_en, description_ar, icon, condition_json) VALUES (?,?,?,?,?,?)')
        .run(b.slug, b.title_ar, b.title_en, b.description_ar, b.icon, b.condition_json);
    }

    // Assessments
    function createAssessment(type, title, stationId, count, timeMin, feedback = 0) {
      const exists = db.prepare('SELECT id FROM assessments WHERE type=? AND title_ar=? AND station_id IS ?').get(type, title, stationId);
      if (exists) return exists.id;
      const info = db.prepare(`INSERT INTO assessments (type, title_ar, station_id, question_count, time_limit_min, show_immediate_feedback, status)
        VALUES (?,?,?,?,?,?, 'published')`).run(type, title, stationId, count, timeMin, feedback);
      const aid = info.lastInsertRowid;
      const where = stationId ? 'station_id = ? AND review_status=\'approved\'' : "review_status='approved'";
      const params = stationId ? [stationId] : [];
      const pool = db.prepare(`SELECT id FROM questions WHERE ${where} ORDER BY RANDOM() LIMIT ?`).all(...params, count);
      const ins = db.prepare('INSERT OR IGNORE INTO assessment_questions (assessment_id, question_id, order_index) VALUES (?,?,?)');
      pool.forEach((q, i) => ins.run(aid, q.id, i));
      return aid;
    }

    createAssessment('diagnostic', 'التقييم التشخيصي', null, 25, 30);
    createAssessment('weekly', 'التحدي الأسبوعي', null, 20, 25);
    createAssessment('mock', 'محاكاة اختبار نافس', null, 40, 45);
    createAssessment('final', 'التقييم الختامي', null, 40, 60);
    createAssessment('daily', 'تحدي اليوم العلمي', null, 5, 10);

    for (const st of STATIONS) {
      const sid = stationIds[st.slug];
      const available = db.prepare("SELECT COUNT(*) c FROM questions WHERE station_id=? AND review_status='approved'").get(sid).c;
      if (available > 0) createAssessment('station', `تقييم محطة: ${st.title_ar}`, sid, available, 15);
    }

    // Sample announcement
    if (!db.prepare('SELECT id FROM announcements LIMIT 1').get()) {
      db.prepare('INSERT INTO announcements (title_ar, body_ar, audience, created_by) VALUES (?,?,?,?)')
        .run('مرحبًا بكنّ في دوري محطات نواتج التعلّم!', 'ابدأن رحلتكنّ العلمية باستكشاف المحطات', 'students', teacher.id);
    }
  });

  tx();
  console.log('✅ Seed complete: teacher, class, students, 16 stations, questions, games, badges, assessments');
}

seed();
