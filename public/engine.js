(function (root) {
 'use strict';
 const categories = ['normal', 'brute_force', 'sql_injection', 'prompt_injection'];
 const risks = ['low', 'medium', 'high', 'critical'];
 const actions = ['observe', 'block_ip', 'escalate'];
 function shape(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return ['La réponse doit être un objet JSON.'];
  const errors = []; const keys = ['incident_id', 'category', 'risk', 'source_ip', 'summary', 'evidence', 'action'];
  for (const k of keys) if (!(k in r)) errors.push(`Champ absent : ${k}`);
  if (Object.keys(r).some(k => !keys.includes(k))) errors.push('Champs supplémentaires : renvoyer uniquement le contrat final.');
  if (typeof r.incident_id !== 'string') errors.push('incident_id doit être du texte.');
  if (!categories.includes(r.category)) errors.push('category : normal, brute_force, sql_injection ou prompt_injection.');
  if (!risks.includes(r.risk)) errors.push('risk : low, medium, high ou critical.');
  if (!actions.includes(r.action)) errors.push('action : observe, block_ip ou escalate.');
  if (r.source_ip !== null && (typeof r.source_ip !== 'string' || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(r.source_ip) || r.source_ip.split('.').some(x => +x > 255))) errors.push('source_ip : IPv4 ou null.');
  if (typeof r.summary !== 'string' || r.summary.trim().length < 15 || r.summary.length > 600) errors.push('summary : entre 15 et 600 caractères.');
  if (!Array.isArray(r.evidence) || r.evidence.length < 2 || r.evidence.length > 4 || r.evidence.some(x => typeof x !== 'string' || !x.trim())) errors.push('evidence : deux à quatre extraits de logs.');
  return errors;
 }
 function decide(r) {
  if (r.category === 'prompt_injection' || r.risk === 'critical') return 'escalate';
  if (r.risk === 'high') return r.source_ip === null ? 'escalate' : 'block_ip';
  return 'observe';
 }
 function validate(r, mission, ref) {
  const errors = shape(r);
  if (errors.length) return { passed: false, score: 0, checks: [{ label: 'Contrat JSON', ok: false, detail: errors.join(' ') }] };
  const expected = ref.response;
  const evidence = r.evidence.every(x => x.trim().length >= 12 && mission.logs.includes(x)) && new Set(r.evidence).size === r.evidence.length;
  const coverage = ref.clues.every(group => r.evidence.some(e => group.some(fragment => e.includes(fragment))));
  const checks = [
   { label: 'Contrat JSON et identifiant', ok: r.incident_id === mission.id, detail: r.incident_id === mission.id ? 'Dossier correctement associé.' : 'Recopier incident_id depuis le webhook.' },
   { label: 'Nature de l’incident', ok: r.category === expected.category, detail: r.category === expected.category ? 'Catégorie cohérente avec les traces.' : 'Relire le contexte : panne, activité autorisée et attaque doivent être distinguées.' },
   { label: 'Risque et source', ok: ref.risks.includes(r.risk) && r.source_ip === expected.source_ip, detail: ref.risks.includes(r.risk) && r.source_ip === expected.source_ip ? 'Risque et origine cohérents.' : 'Vérifier la gravité et la source pertinente. Une panne sans origine malveillante utilise null.' },
   { label: 'Preuves vérifiables', ok: evidence && coverage, detail: evidence && coverage ? 'Extraits présents dans les logs et couvrant les faits décisifs.' : 'Citer 2 à 4 extraits exacts et distincts (au moins 12 caractères), couvrant les indices décisifs.' },
   { label: 'Règle de réponse', ok: r.action === decide(r) && r.action === expected.action, detail: r.action === decide(r) && r.action === expected.action ? ref.effect : 'Vérifier les branches : injection de prompt ou critique → escalade ; élevé → blocage si IP ; sinon observation.' }
  ];
  return { passed: checks.every(c => c.ok), score: checks.filter(c => c.ok).length * 20, checks };
 }
 const api = { shape, decide, validate };
 if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CyberEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
