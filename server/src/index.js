import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
try { process.loadEnvFile(); } catch {}
import authRoutes from './routes/auth.js';
import contentRoutes, { publicRouter } from './routes/content.js';
import assessmentRoutes from './routes/assessments.js';
import progressRoutes from './routes/progress.js';
import adminRoutes from './routes/admin.js';
import competitionRoutes from './routes/competitions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/public', publicRouter);
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api', contentRoutes);
app.use('/api', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/competitions', competitionRoutes);

// Serve built client in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`🚀 Science Championship API running on http://localhost:${PORT}`);
});
