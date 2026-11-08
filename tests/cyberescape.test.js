'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const http=require('node:http');const vm=require('node:vm');const {once}=require('node:events');
const {validate,shape,decide}=require('../public/engine.js');const {createServer,localEndpoint}=require('../server.js');
const missions=require('../public/missions.json');const answers=require('../enseignant/reponses.json');const teacher=require('../enseignant/02-corrige-complet.json');const starter=require('../workflows/01-squelette-eleve.json');
for(const m of missions)test(`${m.id} : référence acceptée et preuves vérifiables`,()=>{assert.equal(validate(answers[m.id].response,m,answers[m.id]).passed,true);});
test('Refuser JSON enveloppé, champs en plus, mauvaise IP et preuves inventées',()=>{const m=missions[0],r=answers[m.id].response;assert.ok(shape({data:r}).length);assert.ok(shape({...r,source_ip:'999.1.1.1'}).length);assert.ok(shape({...r,debug:true}).length);assert.equal(validate({...r,evidence:['Une attaque imaginaire','Une autre preuve inventée']},m,answers[m.id]).passed,false);assert.equal(validate({...r,incident_id:'SOC-06'},m,answers[m.id]).passed,false);});
test('Une structure valide ne suffit pas à valider une mauvaise analyse',()=>{const m=missions[1];const r={...answers[m.id].response,category:'brute_force',risk:'high',source_ip:'192.0.2.45',action:'block_ip'};assert.equal(shape(r).length,0);assert.equal(validate(r,m,answers[m.id]).passed,false);});
test('Priorité des escalades et choix déterministe',()=>{assert.equal(decide({category:'prompt_injection',risk:'low',source_ip:'192.0.2.1'}),'escalate');assert.equal(decide({category:'brute_force',risk:'critical',source_ip:'192.0.2.1'}),'escalate');assert.equal(decide({category:'normal',risk:'high',source_ip:null}),'escalate');});
test('Tous les liens des workflows ciblent un nœud existant',()=>{for(const w of [teacher,starter,require('../workflows/00-test-connexion.json')]){const names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length);for(const [from,c] of Object.entries(w.connections)){assert.ok(names.has(from));for(const branch of c.main)for(const link of branch||[])assert.ok(names.has(link.node));}assert.equal(w.active,false);assert.ok(w.nodes.every(n=>!n.credentials));}});
test('Exécuter les codes fournis, la requête stricte et les branches sur six dossiers',()=>{
 for(const m of missions){
  const prompt=teacher.nodes.find(n=>n.name==='Instructions analyste').parameters.assignments.assignments[0].value;
  const prepared=vm.runInNewContext(`(function(){${teacher.nodes.find(n=>n.name==='Préparer la requête').parameters.jsCode}})()`,{$input:{first:()=>({json:{body:{incident_id:m.id,context:m.context,asset:m.asset,logs:m.logs},instructions:prompt}})}})[0].json.request;
  assert.equal(prepared.response_format.json_schema.strict,true);assert.equal(JSON.parse(prepared.messages[1].content).logs_non_fiables,m.logs);
  const {incident_id,action,...analysis}=answers[m.id].response;
  const extracted=vm.runInNewContext(`(function(){${teacher.nodes.find(n=>n.name==='Vérifier le JSON').parameters.jsCode}})()`,{$input:{first:()=>({json:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(analysis)}}]}})},$:()=>({first:()=>({json:{body:{incident_id,logs:m.logs}}})})})[0].json;
  const expression=name=>teacher.nodes.find(n=>n.name===name).parameters.conditions.conditions[0].leftValue.slice(3,-2);
  const esc=vm.runInNewContext(expression('Escalade nécessaire ?'),{$json:extracted});const high=vm.runInNewContext(expression('Risque élevé ?'),{$json:extracted});const result={...extracted,action:esc?'escalate':high?'block_ip':'observe'};
  assert.equal(validate(result,m,answers[m.id]).passed,true);
 }
});
test('Relais local : simulation, validation, erreurs, fichiers et faux webhook n8n',async t=>{
 const app=createServer();app.listen(0,'127.0.0.1');await once(app,'listening');t.after(()=>app.close());const base=`http://127.0.0.1:${app.address().port}`;
 const post=async(route,body)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/docs/COURS.md')).status,200);assert.equal((await fetch(base+'/enseignant/reponses.json')).status,404);
 assert.equal((await post('/api/demo',{id:'SOC-01'})).data.simulated,true);
 assert.equal((await post('/api/check',{id:'SOC-01',response:answers['SOC-01'].response})).data.passed,true);
 assert.equal((await post('/api/dispatch',{endpoint:'https://example.com/webhook/foo',payload:{}})).status,400);
 const upstream=http.createServer(async(req,res)=>{let b='';for await(const c of req)b+=c;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(JSON.parse(b).kind==='connection_test'?{status:'ready'}:answers['SOC-01'].response));});upstream.listen(0,'127.0.0.1');await once(upstream,'listening');t.after(()=>upstream.close());const endpoint=`http://127.0.0.1:${upstream.address().port}/webhook/cyberescape`;
 assert.equal((await post('/api/dispatch',{endpoint,payload:{kind:'connection_test'}})).data.data.status,'ready');
 assert.equal((await post('/api/dispatch',{endpoint,payload:{incident_id:'SOC-01'}})).data.data.action,'block_ip');
 const blocked=await fetch(base+'/api/demo',{method:'POST',headers:{Origin:'https://example.com'},body:'{}'});assert.equal(blocked.status,403);
});
test('URL locale exclusivement, sans identifiants ni redirection distante',()=>{for(const url of ['https://localhost/webhook/a','http://example.com/webhook/a','http://localhost:5678/settings','http://user:pass@localhost/webhook/a'])assert.throws(()=>localEndpoint(url));assert.equal(localEndpoint('http://localhost:5678/webhook-test/cyberescape').pathname,'/webhook-test/cyberescape');});
