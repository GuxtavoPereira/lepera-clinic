// Dedicated loopback process for load-read.cjs; never use this launcher in production.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomBytes } = require('node:crypto');
const { readOnlyDatabaseUrl } = require('./load-utils.cjs');

assert.ok(process.send, 'Start this process through load-read.cjs');
Object.assign(process.env, {
  NODE_ENV: 'test', PORT: '3333', WEB_URL: 'http://localhost:3000',
  DATABASE_URL: readOnlyDatabaseUrl(process.env.LEPERA_LOAD_DATABASE_URL),
  JWT_SECRET: randomBytes(32).toString('hex'),
  // This workload never reads decrypted clinical fields.
  ENCRYPTION_KEY: randomBytes(32).toString('hex'), RESET_DATABASE: 'false',
  GOOGLE_CLIENT_ID: '', SMTP_HOST: '', SMTP_PORT: '465', SMTP_USER: '',
  SMTP_PASSWORD: '', SMTP_FROM: '', TRUST_PROXY: '0',
});

const requireApi = createRequire(path.resolve(__dirname, '../../apps/api/package.json'));
const { NestFactory } = requireApi('@nestjs/core');
const { ValidationPipe } = requireApi('@nestjs/common');
const { AppModule } = requireApi('./dist/app.module.js');
let app, timer;
let shuttingDown = false;
async function stop() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(timer);
  await app?.close();
  process.exit(0);
}
process.on('message', message => { if (message === 'stop') void stop(); });
process.on('disconnect', () => void stop());

(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.use((req, res, next) => {
    if (req.method === 'GET' || (req.method === 'POST' && req.path === '/api/auth/login')) next();
    else res.status(405).json({ message: 'Read-only load test' });
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  process.send({ type: 'ready', port: app.getHttpServer().address().port });
  timer = setInterval(() => {
    const memory = process.memoryUsage(), cpu = process.cpuUsage();
    process.send?.({ type: 'sample', at: Date.now(), rss: memory.rss, heapUsed: memory.heapUsed, cpuMs: (cpu.user + cpu.system) / 1000 });
  }, 1000);
})().catch(() => {
  // Do not forward connection strings, query arguments or application payloads to logs.
  process.send?.({ type: 'startup-error' });
  process.exit(1);
});
