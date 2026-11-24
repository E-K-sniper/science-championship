// Deploy the API to Render using the Render API.
// Reads RENDER_API_KEY from server/.env (never printed).
// Usage: node scripts/deploy-render.mjs https://github.com/USER/REPO
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', 'server', '.env');

function readEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnv(envPath);
const KEY = env.RENDER_API_KEY;
if (!KEY) {
  console.error('❌ RENDER_API_KEY غير موجود في server/.env — أضيفيه أولًا');
  process.exit(1);
}

const repo = process.argv[2];
if (!repo) {
  console.error('Usage: node scripts/deploy-render.mjs https://github.com/USER/REPO');
  process.exit(1);
}

const API = 'https://api.render.com/v1';
async function rapi(method, p, body) {
  const res = await fetch(API + p, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status}: ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 500)}`);
  return data;
}

// 1) Find owner/workspace
const owners = await rapi('GET', '/owners?limit=20');
const owner = owners[0];
console.log('👤 Workspace:', owner.name);

// 2) Check if service already exists
const existing = await rapi('GET', `/services?name=science-championship-api&limit=5`).catch(() => []);
let service = existing.find(s => s.service?.name === 'science-championship-api')?.service || existing[0]?.service;

// 3) Create service if needed
if (!service) {
  console.log('🚀 Creating web service...');
  const created = await rapi('POST', '/services', {
    type: 'web_service',
    name: 'science-championship-api',
    ownerId: owner.owner?.id || owner.id,
    repo,
    branch: 'main',
    autoDeploy: 'yes',
    serviceDetails: {
      runtime: 'node',
      env: 'node',
      region: 'oregon',
      plan: 'free',
      envSpecificDetails: {
        buildCommand: 'npm install',
        startCommand: 'node src/index.js',
      },
    },
  });
  service = created.service || created;
  console.log('✅ Service created:', service.id);
} else {
  console.log('ℹ️ Service exists:', service.id, service.url || '');
}

// 4) Env vars
const jwt = crypto.randomBytes(32).toString('hex');
await rapi('PUT', `/services/${service.id}/env-vars`, [
  { key: 'JWT_SECRET', value: jwt },
  { key: 'NODE_VERSION', value: '22' },
]);
console.log('🔐 Env vars set (JWT_SECRET generated)');

// 5) Trigger deploy
const deploy = await rapi('POST', `/services/${service.id}/deploys`, { clearCache: 'do_not_clear' });
console.log('📦 Deploy triggered:', deploy.id || '');
console.log('\n🌐 Service URL will be: https://' + (service.name || 'science-championship-api') + '.onrender.com');
console.log('⏳ الانتشار يأخذ ~3-5 دقائق. تحقق من: https://dashboard.render.com');
