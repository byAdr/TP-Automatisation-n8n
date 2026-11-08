'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('./public/engine.js');
const root = __dirname;
const missions = JSON.parse(fs.readFileSync(path.join(root, 'public/missions.json'), 'utf8'));
const answers = JSON.parse(fs.readFileSync(path.join(root, 'enseignant/reponses.json'), 'utf8'));
function localEndpoint(value) {
 const u = new URL(value);
 if (u.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(u.hostname) || u.username || u.password || u.hash || u.search || !/^\/webhook(?:-test)?\/[a-zA-Z0-9/_-]+$/.test(u.pathname)) throw new Error('Utiliser une URL HTTP locale n8n, avec /webhook/ ou /webhook-test/.');
 return u;
}
function send(res, status, data) {
 res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
 res.end(JSON.stringify(data));
}
async function body(req) {
 let text = '';
 for await (const c of req) { text += c; if (text.length > 100000) throw new Error('Requête trop volumineuse.'); }
 return JSON.parse(text);
}
function createServer() {
 return http.createServer(async (req, res) => {
  try {
   const host = req.headers.host;
   if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return send(res, 403, { error: 'Accès local uniquement.' });
   const url = new URL(req.url, `http://${host}`);
   if (req.method === 'POST') {
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return send(res, 403, { error: 'Origine refusée.' });
    const b = await body(req);
    if (url.pathname === '/api/dispatch') {
     const endpoint = localEndpoint(b.endpoint);
     if (!b.payload || typeof b.payload !== 'object') throw new Error('Données absentes.');
     const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b.payload), signal: AbortSignal.timeout(65000), redirect: 'error' });
     const raw = await response.text(); let data;
     try { data = JSON.parse(raw); } catch { return send(res, 502, { error: 'n8n ne renvoie pas de JSON. Vérifier Respond to Webhook et les exécutions n8n.', upstreamStatus: response.status }); }
     return send(res, response.ok ? 200 : 502, { data, upstreamStatus: response.status });
    }
    const mission = missions.find(m => m.id === b.id);
    if (!mission) return send(res, 400, { error: 'Dossier inconnu.' });
    if (url.pathname === '/api/demo') return send(res, 200, { data: answers[mission.id].response, simulated: true });
    if (url.pathname === '/api/check') return send(res, 200, validate(b.response, mission, answers[mission.id]));
    return send(res, 404, { error: 'Route inconnue.' });
   }
   if (req.method !== 'GET') return send(res, 405, { error: 'Méthode refusée.' });
   if (url.pathname === '/health') return send(res, 200, { ok: true });
   let file;
   if (url.pathname.startsWith('/docs/')) file = path.join(root, 'docs', path.basename(url.pathname));
   else if (url.pathname.startsWith('/workflows/')) file = path.join(root, 'workflows', path.basename(url.pathname));
   else if (url.pathname === '/ressources/agent-a-completer.md') file = path.join(root, 'ressources/agent-a-completer.md');
   else file = path.join(root, 'public', url.pathname === '/' ? 'index.html' : path.basename(url.pathname));
   const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };
   if (!types[path.extname(file)] || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Fichier absent.' });
   res.writeHead(200, { 'Content-Type': `${types[path.extname(file)]}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
   fs.createReadStream(file).pipe(res);
  } catch (e) { send(res, 400, { error: e.name === 'TimeoutError' ? 'n8n a dépassé 65 secondes. Consulter son exécution, puis réessayer.' : e.message }); }
 });
}
if (require.main === module) {
 const server = createServer();
 server.on('error', e => { console.error(`Impossible de démarrer : ${e.message}. Le port 8080 est peut-être déjà utilisé.`); process.exitCode = 1; });
 server.listen(8080, '127.0.0.1', () => console.log('CyberEscape : http://127.0.0.1:8080 — Ctrl+C pour arrêter.'));
}
module.exports = { createServer, localEndpoint };
