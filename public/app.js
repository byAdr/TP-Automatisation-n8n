'use strict';
const $ = id => document.getElementById(id);
let missions, index = 0, busy = false, latest = null;
const storageKey = 'cyberescape-v1';
let state;
try { state = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { state = {}; }
if (!state.real || typeof state.real !== 'object') state.real = {};
if (!state.demo || typeof state.demo !== 'object') state.demo = {};
const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { $('connectionStatus').textContent = 'La sauvegarde locale est indisponible. Exporter le bilan avant de fermer.'; } };
function mode() { return $('mode').value; }
function record() { const bucket = mode() === 'real' ? state.real : state.demo; return bucket[missions[index].id] ||= { attempts: 0, hints: 0, passed: false, score: 0 }; }
function payload() { const m = missions[index]; return { incident_id: m.id, context: m.context, asset: m.asset, logs: m.logs }; }
async function post(route, data) {
 const r = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(70000) });
 const b = await r.json();
 if (!r.ok) throw new Error(b.error || `Erreur HTTP ${b.upstreamStatus || r.status} : consulter les exécutions n8n.`);
 if (b.upstreamStatus >= 400) throw new Error(`n8n répond HTTP ${b.upstreamStatus}. Vérifier l’URL, l’écoute du webhook et l’exécution.`);
 return b;
}
function setBusy(value) {
 busy = value;
 for (const id of ['analyze','connect','mode','endpoint','next','reset']) $(id).disabled = value;
 document.querySelectorAll('.mission-link').forEach(b => b.disabled = value);
 $('analyze').textContent = value ? 'Analyse en cours…' : 'Analyser les logs';
 if (!value) updateProgress();
}
function updateProgress() {
 const count = missions.filter(m => state.real[m.id]?.passed).length;
 $('progress').value = count; $('progressCount').textContent = `${count} / 6`;
 $('attempts').textContent = `${record().attempts} essai(s) · ${record().hints} indice(s) · meilleur résultat : ${record().score} / 100${mode() === 'demo' ? ' (simulé)' : ''}`;
 $('next').disabled = busy || !record().passed || index === missions.length - 1;
 $('missions').replaceChildren(...missions.map((m,i) => {
  const b = document.createElement('button'); b.className = `mission-link${i===index?' active':''}${(mode()==='real'?state.real:state.demo)[m.id]?.passed?' done':''}`;
  b.disabled = busy; if(i===index)b.setAttribute('aria-current','step');
  const num=document.createElement('span');num.className='num';num.textContent=String(i+1).padStart(2,'0');
  const label=document.createElement('span');label.textContent=m.title;
  const small=document.createElement('small');small.textContent=(mode()==='real'?state.real:state.demo)[m.id]?.passed?'Validé':'À examiner';label.append(small);b.append(num,label);
  // Past dossiers stay available; unseen dossiers unlock after the preceding success.
  b.disabled = busy || (i > 0 && !(mode()==='real'?state.real:state.demo)[missions[i-1].id]?.passed && !(mode()==='real'?state.real:state.demo)[m.id]?.passed);
  b.onclick=()=>{index=i;render();};return b;
 })); persist();
}
function showHints(){const m=missions[index];$('hints').replaceChildren(...m.hints.slice(0,record().hints).map((h,i)=>{const p=document.createElement('p');p.textContent=`Indice ${i+1} — ${h}`;return p;}));$('hint').disabled=record().hints>=m.hints.length;}
function render(){
 const m=missions[index]; latest=null;
 for(const [id,key] of [['title','title'],['level','level'],['goal','goal'],['context','context'],['asset','asset'],['duration','time']])$(id).textContent=m[key];
 $('dossier').textContent=m.id;
 $('logs').replaceChildren(...m.logs.split('\n').map((line,i)=>{const row=document.createElement('div');row.className='log-line';const n=document.createElement('span');n.className='line-number';n.textContent=String(i+1).padStart(2,'0');const c=document.createElement('span');c.className='log-content';const t=document.createElement('time');t.textContent=line.slice(0,20);c.append(t,document.createTextNode(line.slice(20)));row.append(n,c);return row;}));
 $('empty').hidden=false;$('report').hidden=true;$('checks').replaceChildren();$('responseLabel').textContent='En attente';$('result').className='';$('result').textContent=record().passed?'Dossier déjà validé — tu peux rejouer l’analyse':'Ton enquête commence avec la lecture du contexte';
 $('endpoint').disabled=mode()==='demo';$('connect').disabled=mode()==='demo';
 $('connectionStatus').textContent=mode()==='demo'?'Démonstration : réponses simulées, sans appel Groq. Le parcours réel reste indépendant.':'Mode réel : chaque analyse appelle ton workflow n8n, puis Groq. La clé reste dans n8n.';
 showHints();updateProgress();
}
function displayResponse(data){
 $('raw').textContent=JSON.stringify(data,null,2);$('empty').hidden=true;$('report').hidden=false;
 $('riskLabel').textContent=({low:'Risque faible',medium:'Risque moyen',high:'Risque élevé',critical:'Risque critique'})[data?.risk]||'Format à vérifier';
 $('categoryLabel').textContent=({normal:'Aucune attaque identifiée',brute_force:'Force brute',sql_injection:'Injection SQL',prompt_injection:'Injection de prompt'})[data?.category]||'Réponse reçue';
 $('summary').textContent=typeof data?.summary==='string'?data.summary:'Ouvrir le JSON et vérifier le contrat.';
 $('actionLabel').textContent=({observe:'Observer',block_ip:'Bloquer l’IP (simulation)',escalate:'Transmettre à un analyste'})[data?.action]||'Non définie';
}
$('analyze').onclick=async()=>{
 if(busy)return;setBusy(true);const rec=record();rec.attempts++;persist();latest=null;$('report').hidden=true;$('empty').hidden=false;$('checks').replaceChildren();$('responseLabel').textContent='Analyse en cours';$('result').className='';$('result').textContent='Transmission des logs et attente du rapport…';
 try{
  const response=mode()==='demo'?await post('/api/demo',{id:missions[index].id}):await post('/api/dispatch',{endpoint:$('endpoint').value,payload:payload()});
  const data=response.data;displayResponse(data);latest=data;
  const result=await post('/api/check',{id:missions[index].id,response:data});
  $('checks').replaceChildren(...result.checks.map(c=>{const d=document.createElement('div');d.className=`check ${c.ok?'ok':'fail'}`;const t=document.createElement('strong');t.textContent=`${c.ok?'✓':'×'} ${c.label}`;const p=document.createElement('p');p.textContent=c.detail;d.append(t,p);return d;}));
  rec.score=Math.max(rec.score,result.score);rec.passed ||= result.passed;rec.lastResponse=data;rec.updatedAt=new Date().toISOString();
  $('responseLabel').textContent=`${result.score} / 100${mode()==='demo'?' · simulé':''}`;
  const complete=missions.every(m=>(mode()==='real'?state.real:state.demo)[m.id]?.passed);
  $('result').textContent=result.passed?(complete?(mode()==='real'?'Les six dossiers sont validés · Code de clôture : BLACKOUT-091':'Démonstration terminée · Passe au mode réel pour tester ton workflow'):'Dossier validé · Tu peux poursuivre ou rejouer avec les mêmes logs'):'Le rapport doit être corrigé · Consulte les vérifications ci-dessus';
 }catch(e){$('result').className='error';$('result').textContent=`${e.message} Si l’URL contient webhook-test, cliquer d’abord sur Listen for test event dans n8n.`;$('responseLabel').textContent='Échec de l’analyse';}
 finally{persist();setBusy(false);$('endpoint').disabled=mode()==='demo';$('connect').disabled=mode()==='demo';}
};
$('connect').onclick=async()=>{setBusy(true);try{const r=await post('/api/dispatch',{endpoint:$('endpoint').value,payload:{kind:'connection_test',incident_id:'PING',context:'Test de liaison : aucune analyse IA attendue.',logs:''}});$('connectionStatus').textContent=r.data?.status==='ready'?'Connexion réussie · n8n répond ready, sans appel Groq':'n8n a répondu, mais le test attend {"status":"ready"}. Importer le workflow de connexion ou ajouter la branche PING.';}catch(e){$('connectionStatus').textContent=e.message+' Vérifier l’écoute de test ou l’activation du workflow.';}finally{setBusy(false);}};
$('mode').onchange=()=>{index=0;state.mode=mode();render();};
$('endpoint').onchange=()=>{state.endpoint=$('endpoint').value;persist();};
$('hint').onclick=()=>{record().hints++;showHints();updateProgress();};
$('next').onclick=()=>{if(index<missions.length-1&&record().passed){index++;render();}};
$('copyLogs').onclick=async()=>{try{await navigator.clipboard.writeText(missions[index].logs);$('copyLogs').textContent='Logs copiés';}catch{$('copyLogs').textContent='Sélectionner les lignes pour copier';}setTimeout(()=>$('copyLogs').textContent='Copier les logs',1800);};
$('reset').onclick=()=>{if(confirm('Effacer les résultats locaux et les indices des deux modes ?')){state={real:{},demo:{},endpoint:$('endpoint').value};index=0;persist();render();}};
$('export').onclick=()=>{const report={version:'0.1.0',exportedAt:new Date().toISOString(),real:state.real,demo:state.demo,note:'Les résultats demo sont simulés. Les durées sont à mesurer pendant l’essai.'};const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='bilan-cyberescape.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
fetch('/missions.json').then(r=>{if(!r.ok)throw new Error('Missions indisponibles');return r.json();}).then(data=>{missions=data;if(state.endpoint)$('endpoint').value=state.endpoint;if(state.mode==='real')$('mode').value='real';render();}).catch(e=>{$('connectionStatus').textContent=`${e.message}. Lancer node server.js et ouvrir http://127.0.0.1:8080.`;});
