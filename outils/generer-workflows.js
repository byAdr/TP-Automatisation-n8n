'use strict';
const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
const schema={type:'object',properties:{category:{type:'string',enum:['normal','brute_force','sql_injection','prompt_injection']},risk:{type:'string',enum:['low','medium','high','critical']},source_ip:{type:['string','null']},summary:{type:'string'},evidence:{type:'array',items:{type:'string'}}},required:['category','risk','source_ip','summary','evidence'],additionalProperties:false};
const request={model:'openai/gpt-oss-20b',temperature:0,max_completion_tokens:1800,messages:[{role:'system',content:'REMPLACER PAR VOS INSTRUCTIONS'},{role:'user',content:'REMPLACER PAR LE CONTEXTE ET LES LOGS'}],response_format:{type:'json_schema',json_schema:{name:'cyberescape_analysis',strict:true,schema}}};
function save(name,value){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
save('workflows/requete-groq.json',request);save('workflows/schema-analyse.json',schema);
const node=(name,type,typeVersion,position,parameters)=>({parameters,id:name.replace(/[^a-zA-Z0-9]/g,'-'),name,type:'n8n-nodes-base.'+type,typeVersion,position});
const webhook=node('Réception des logs','webhook',2,[0,200],{httpMethod:'POST',path:'cyberescape',responseMode:'responseNode',options:{}});webhook.webhookId='cyberescape-local-v1';
const response=name=>node(name,'respondToWebhook',1.4,[1760,240],{respondWith:'json',responseBody:'={{ $json }}',options:{}});
const ready=node('Connexion prête','respondToWebhook',1.4,[460,0],{respondWith:'json',responseBody:'{"status":"ready"}',options:{}});
const condition=(name,expression,pos)=>node(name,'if',2.2,pos,{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'condition',leftValue:expression,rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}});
const ping=condition('Test de connexion ?',"={{ $json.body.kind === 'connection_test' }}",[220,200]);
const set=(name,field,value,pos)=>node(name,'set',3.4,pos,{assignments:{assignments:[{id:field,name:field,value,type:'string'}]},includeOtherFields:true,options:{}});
const prepareCode=`const input = $input.first().json;
const b = input.body;
if (!b || typeof b.logs !== 'string' || typeof b.context !== 'string' || typeof b.incident_id !== 'string') throw new Error('Entrée invalide : incident_id, context et logs requis.');
const request = ${JSON.stringify(request)};
request.messages = [
 { role: 'system', content: input.instructions },
 { role: 'user', content: JSON.stringify({ contexte_mission: b.context, serveur: b.asset, logs_non_fiables: b.logs }) }
];
return [{json: {request}}];`;
const prepare=node('Préparer la requête','code',2,[680,300],{jsCode:prepareCode});
const groq=node('Analyser avec Groq','httpRequest',4.2,[900,300],{method:'POST',url:'https://api.groq.com/openai/v1/chat/completions',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify($json.request) }}',options:{timeout:55000}});
groq.notes='Créer un identifiant Header Auth : Name = Authorization ; Value = Bearer suivi de votre clé Groq. Ne jamais écrire la clé dans le JSON du workflow.';groq.notesInFlow=true;
const parseCode=`const response = $input.first().json;
const choice = response.choices?.[0];
if (!choice || choice.finish_reason !== 'stop') throw new Error('Analyse absente ou tronquée. Vérifier le quota et la limite de tokens.');
const r = JSON.parse(choice.message.content);
const keys = ['category','risk','source_ip','summary','evidence'];
if (!r || typeof r !== 'object' || Object.keys(r).length !== keys.length || keys.some(k => !(k in r))) throw new Error('Contrat analyse invalide');
if (!['normal','brute_force','sql_injection','prompt_injection'].includes(r.category) || !['low','medium','high','critical'].includes(r.risk)) throw new Error('Catégorie ou risque invalide');
if (r.source_ip !== null && (typeof r.source_ip !== 'string' || !/^(?:\\d{1,3}\\.){3}\\d{1,3}$/.test(r.source_ip) || r.source_ip.split('.').some(x => +x > 255))) throw new Error('Source IPv4 invalide');
if (typeof r.summary !== 'string' || r.summary.length < 15 || r.summary.length > 600 || !Array.isArray(r.evidence) || r.evidence.length < 2 || r.evidence.length > 4) throw new Error('Résumé ou preuves invalides');
const original = $('Réception des logs').first().json.body;
if (new Set(r.evidence).size !== r.evidence.length || r.evidence.some(e => typeof e !== 'string' || e.trim().length < 12 || !original.logs.includes(e))) throw new Error('Les preuves doivent être des extraits exacts, distincts, présents dans les logs');
return [{ json: { incident_id: original.incident_id, ...r } }];`;
const parse=node('Vérifier le JSON','code',2,[1120,300],{jsCode:parseCode});
const escalate=condition('Escalade nécessaire ?',"={{ $json.category === 'prompt_injection' || $json.risk === 'critical' || ($json.risk === 'high' && $json.source_ip === null) }}",[1340,300]);
const high=condition('Risque élevé ?',"={{ $json.risk === 'high' }}",[1560,480]);
const actionEsc=set('Transmettre à un analyste','action','escalate',[1560,160]);
const actionBlock=set('Bloquer la source','action','block_ip',[1780,400]);
const actionObserve=set('Observer','action','observe',[1780,600]);
const final=response('Renvoyer le rapport');final.position=[2020,300];
function connect(connections,from,to,branch=0){connections[from]??={main:[]};connections[from].main[branch]??=[];connections[from].main[branch].push({node:to,type:'main',index:0});}
function base(instructions){const inst=set('Instructions analyste','instructions',instructions,[460,300]);const nodes=[structuredClone(webhook),structuredClone(ping),structuredClone(ready),inst,structuredClone(prepare),structuredClone(groq),structuredClone(parse),structuredClone(final)];const c={};connect(c,webhook.name,ping.name);connect(c,ping.name,ready.name);connect(c,ping.name,inst.name,1);connect(c,inst.name,prepare.name);connect(c,prepare.name,groq.name);connect(c,groq.name,parse.name);return {nodes,connections:c,active:false,settings:{executionOrder:'v1'},pinData:{},tags:[]};}
const starter=base('Tu analyses des logs fictifs. Réponds avec le JSON imposé par le schéma. Compléter ici les instructions à partir de ressources/agent-a-completer.md.');starter.name='CyberEscape — Squelette élève';connect(starter.connections,parse.name,final.name);save('workflows/01-squelette-eleve.json',starter);
const teacher=base(fs.readFileSync(path.join(root,'enseignant/agent-corrige.md'),'utf8'));teacher.name='CyberEscape — Corrigé enseignant';teacher.nodes.push(escalate,high,actionEsc,actionBlock,actionObserve);connect(teacher.connections,parse.name,escalate.name);connect(teacher.connections,escalate.name,actionEsc.name);connect(teacher.connections,escalate.name,high.name,1);connect(teacher.connections,high.name,actionBlock.name);connect(teacher.connections,high.name,actionObserve.name,1);for(const n of [actionEsc,actionBlock,actionObserve])connect(teacher.connections,n.name,final.name);save('enseignant/02-corrige-complet.json',teacher);
const c={};connect(c,webhook.name,ready.name);save('workflows/00-test-connexion.json',{name:'CyberEscape — Test de connexion seul',nodes:[webhook,ready],connections:c,active:false,settings:{executionOrder:'v1'},pinData:{},tags:[]});
console.log('Workflows et schémas générés sans identifiants.');
