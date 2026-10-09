import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, assert } from './io.mjs';
import { approvalDevices, approvalOrigin, applyApprovedAction, createApprovalChallenge } from './approvals.mjs';

/** Explicit owner-managed service. TLS termination must be trusted; never
 * exposes enrollment or an arbitrary shell endpoint. No service starts on init. */
export async function startApprovalServer(space, { origin, host = '127.0.0.1', port = 8787, cert, key, trustedProxy = false, store } = {}) {
  origin = approvalOrigin(origin);
  assert(Number.isInteger(port) && port >= 0 && port <= 65535, 'Недопустимый порт');
  assert(['127.0.0.1', '::1', 'localhost'].includes(host) || cert && key, 'Внешний интерфейс разрешён только с TLS');
  assert(!origin.startsWith('https:') || cert && key || trustedProxy, 'HTTPS требует сертификат либо явный доверенный локальный TLS proxy');
  const assets = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
  const handler = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    try {
      // Pin Host too: protects a localhost service against DNS rebinding.
      const expected = new URL(origin);
      assert(req.headers.host === expected.host, 'Не совпал Host');
      if (req.method === 'GET' && assets.has(req.url)) {
        const [file, type] = assets.get(req.url); res.writeHead(200, { 'Content-Type': type });
        res.end(await fs.readFile(path.join(ROOT, 'assets', 'approval', file))); return;
      }
      if (req.method === 'GET' && req.url === '/devices') {
        return json(200, (await approvalDevices(space, { store })).filter(d => !d.revoked && d.origin === origin).map(d => ({ id: d.id })));
      }
      assert(req.method === 'POST' && ['/challenge', '/apply'].includes(req.url) && req.headers.origin === origin
        && req.headers['content-type']?.split(';')[0] === 'application/json', 'Разрешены только запросы JSON с выбранного origin');
      let body = '', size = 0;
      for await (const bytes of req) { size += bytes.length; assert(size <= 131072, 'Запрос слишком большой'); body += bytes.toString('utf8'); }
      const data = JSON.parse(body);
      if (req.url === '/challenge') {
        const challenge = await createApprovalChallenge(space, data, { store });
        assert(challenge.origin === origin, 'Устройство сопряжено с другим origin'); return json(200, challenge);
      }
      json(200, await applyApprovedAction(space, data, { store }));
    } catch (e) { json(400, { error: e.message }); }
  };
  const server = cert && key ? https.createServer({ cert: await fs.readFile(cert), key: await fs.readFile(key) }, handler) : http.createServer(handler);
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return server;
}
