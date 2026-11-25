# دوري محطات نواتج التعلّم – العلوم
## Science Learning Outcomes Championship

منصة تعليمية تفاعلية متكاملة لمرحلة الصف السادس — المدرسة السادسة عشر.
> ## 🚀 نشر بضغطة واحدة على Koyeb
> **[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&name=science-championship&repository=E-K-sniper%2Fscience-championship&branch=main&builder=dockerfile&instance_type=nano&ports=8000%3Bhttp%3B%2F&env%5BNODE_ENV%5D=production&env%5BJWT_SECRET%5D=f70cdff2eda83dc3a6560bea233c45c9d56c3d373de6f94e4e8de9f24ba2a337&env%5BDATABASE_PATH%5D=%2Fdata)**
>
> اضغطي الزر ← ستفتح صفحة Koyeb بكل الإعدادات جاهزة ← اضغطي **Deploy**. بعد النشر ستحصلين على رابط `https://....koyeb.app`.

---

معلمة المشروع: **موضي أحمد علي الزقلي** | مديرة المدرسة: **مزنه الصقور** | العام الدراسي: **1448هـ**

---

## ما الذي بُني فعليًا؟

### للطالبات
- ✅ حسابات فردية وآمنة (JWT + كلمات مرور مشفرة)
- ✅ لوحة تحكم شخصية: النقاط، المستوى، خريطة المحطات الـ16، الأوسمة، التوصيات العلاجية، الإعلانات
- ✅ 16 محطة علوم كاملة: درس + أهداف + نواتج تعلم + نشاط تفاعلي + تجربة افتراضية + اختبار
- ✅ محرك اختبارات كامل: أسئلة عشوائية، مؤقت، تصحيح فوري، شرح للإجابات، سجل محاولات
- ✅ 14 لعبة علمية عاملة فعليًا (عجلة حظ، ذاكرة، مليونير، صيد كنوز، غرفة هروب، سباق صواريخ...)
- ✅ مختبر افتراضي بـ16 محاكاة تفاعلية
- ✅ نظام نقاط وأوسمة وشهادات قابلة للطباعة (PDF عبر الطباعة)
- ✅ مسابقات مع لوحات متصدرات
- ✅ لوحة صدارة عامة
- ✅ واجهة عربية RTL كاملة، متجاوبة مع الجوال

### للمعلمة
- ✅ إدارة الطالبات (إضافة/تعديل/تعطيل/حذف/إعادة كلمة مرور/استيراد Excel-CSV)
- ✅ إدارة الصفوف والسنوات الدراسية
- ✅ بنك أسئلة كامل (CRUD + استيراد + مراجعة المسودات)
- ✅ إنشاء اختبارات باختيار عشوائي من البنك
- ✅ إنشاء مسابقات وإدارة حالتها ونتائجها
- ✅ تحليلات حقيقية: أداء المحطات، الطالبات، الأسئلة الأكثر خطأً، مستويات الإتقان
- ✅ تقارير Excel وتصدير
- ✅ إصدار ومراجعة الشهادات
- ✅ إعدادات المنصة وقيم النقاط
- ✅ نشر إعلانات للطالبات

---

## التشغيل محليًا

### المتطلبات
- Node.js 20+ (تم التطوير على Node 24)

### الخطوات
```bash
# 1) تثبيت الاعتماديات
npm run install:all

# 2) بناء قاعدة البيانات والبيانات التجريبية
npm --prefix server run seed

# 3) تشغيل الخادم والواجهة معًا
npm run dev
```

ثم افتح: **http://localhost:5173** (وضع التطوير) أو **http://localhost:4000** (الإنتاج المحلي).

### حسابات الدخول
| الدور | البريد | كلمة المرور |
|---|---|---|
| معلمة | `teacher@science.edu` | `teacher123` |
| طالبة تجريبية | `sara@student.edu` | `123456` |
| طالبة تجريبية | `noura@student.edu` | `123456` |
| طالبة تجريبية | `reem@student.edu` | `123456` |

> ⚠️ غيّري كلمة مرور المعلمة فور أول دخول من صفحة الإعدادات.

---

## النشر على الإنترنت (خطوات جاهزة)

المنصة تعمل كخادم واحد (Express) يقدم الواجهة المبنية + API + قاعدة SQLite — أي استضافة Node.js تناسبها.

### الخيار الأسهل: Render.com (مجاني)
1. ارفعي المشروع على GitHub (أو استخدمي Git).
2. في Render: **New → Web Service** → اربطي المستودع.
3. الإعدادات:
   - **Build Command:** `npm --prefix client install && npm --prefix client run build && npm --prefix server install`
   - **Start Command:** `node server/src/index.js`
4. أضيفي **Persistent Disk** (500MB مثلًا) واربطيه بـ `server/data` — ضروري لقاعدة SQLite.
5. متغيرات البيئة:
   - `PORT` = `10000` (Render يعيّنه تلقائيًا)
   - `JWT_SECRET` = نص عشوائي طويل (ولّديه من https://generate-secret.vercel.app)
6. Deploy → ستحصلين على رابط `https://....onrender.com`.

### بديل: Railway / Fly.io
نفس الفكرة: خدمة Node واحدة + volume للقرص + متغيرات البيئة.

### النشر على Vercel (الواجهة) + Render (الخادم)
- الواجهة 정적 يمكن نشرها على Vercel، لكن الخادم يجب أن يكون على Render/Railway.
- عندها عدّلي `client/vite.config.ts` proxy أو استخدمي متغير `VITE_API_URL`.

### قاعدة بيانات بديلة (مستقبلاً)
الكود يستخدم `node:sqlite` المدمج في Node. للانتقال إلى PostgreSQL/Supabase لاحقًا يمكن استبدال طبقة `db.js` فقط — بقية الكود لا يتغير.

---

## البنية التقنية

```
منصه/
├── server/               # Express + node:sqlite (قاعدة حقيقية دائمة)
│   └── src/
│       ├── db.js         # المخطط والعلاقات (18 جدولًا)
│       ├── auth.js       # JWT + صلاحيات + إعدادات
│       ├── seed.js       # البيانات الأولية
│       ├── seed/content.js # محتوى المحطات الـ16 + الأسئلة + الألعاب
│       ├── lib/gamification.js # النقاط/الأوسمة/الشهادات/الإتقان
│       ├── lib/certPrint.js    # طباعة الشهادات
│       └── routes/       # auth, content, assessments, progress, admin, competitions
└── client/               # React + TypeScript + Tailwind (RTL)
    └── src/pages/        # student + teacher pages
```

### الجداول الرئيسية
users, classes, academic_years, stations, lessons, activities, experiments, games, questions, question_options, assessments, assessment_questions, assessment_attempts, student_answers, station_progress, activity_progress, student_outcomes, points_transactions, badges, student_badges, competitions, competition_participants, competition_assessments, announcements, certificates, settings

---

## الأمان المنفذ
- كلمات مرور مشفرة (bcrypt)
- JWT بانتهاء صلاحية + تحقق من نشاط الحساب
- صلاحيات حسب الدور (معلمة/طالبة) على كل المسارات الحساسة
- إجابات الاختبارات لا تُرسل للواجهة قبل التسليم
- النقاط والأوسمة تُحسب في الخادم فقط مع منع التكرار (idempotent)
- الطالبات لا يستطعن تعديلresults أو نقاطهن
- leaderboards تعرض الأسماء المعروضة فقط

## القيود المعروفة
- قاعدة البيانات SQLite — مناسبة لمدرسة واحدة؛ للتوسع الكبير انتقلي لـ PostgreSQL
- المحتوى الأولي: ~5 أسئلة لكل محطة (80 سؤالًا) — المعلمة تستطيع إضافة المزيد من لوحة التحكم أو استيراد ملف
- بعض "التجارب" محاكاة تعليمية تفاعلية (ليست محاكاة فيزيائية كاملة)
- لا يوجد إرسال إيميلات (إعلانات داخلية فقط)
- مولّدات PDF تعتمد على طباعة المتصفح (تعمل بشكل موثوق مع العربية)
