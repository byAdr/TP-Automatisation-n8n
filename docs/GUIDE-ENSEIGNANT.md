# CyberEscape — Guide de première prise en main

Cette V1 est destinée à ton essai, avant distribution aux élèves. Elle comprend six dossiers, une interface locale, un parcours guidé, un cours texte, un squelette n8n et un corrigé. Aucun diaporama n'est fourni. Les actions ne modifient aucun serveur réel.

## 1. Voir le jeu sans rien connecter

1. Ouvrir le dossier du projet dans l'Explorateur Windows.
2. Double-cliquer sur Lancer-CyberEscape.cmd. Garder la console ouverte. Si Node.js est absent, l'installer depuis [le site officiel](https://nodejs.org/), puis relancer.
3. Ouvrir http://127.0.0.1:8080 dans le navigateur.
4. Garder Démonstration sans IA. Lire le contexte du premier dossier, puis cliquer sur Analyser les logs.
5. Examiner les cinq vérifications, ouvrir Réponse JSON reçue et cliquer sur Dossier suivant.
6. Essayer les six dossiers. Demander des indices et exporter le bilan.

Le mode démo utilise les réponses de référence. Il ne mesure ni la qualité du LLM ni la connexion n8n. Ses succès sont séparés du parcours réel. Aucun compte ou abonnement n'est nécessaire pour ce mode.

## 2. Préparer n8n et Groq avant le TP

Prévoir un n8n local fonctionnel sur chaque poste, un navigateur récent et Node.js pour le simulateur. Le cours (environ 20 minutes) et les installations sont hors des 60–90 minutes de manipulation. Aucun Ollama n'est utilisé.

Pour n8n, utiliser en priorité l'installation déjà validée par l'établissement, par exemple son déploiement Docker local avec le port 5678 exposé. Pour un essai sur un poste personnel avec Node.js compatible, on peut encore tester une version 2 avec la commande suivante dans un terminal séparé :

```text
npx n8n@2
```

La documentation annonce la dépréciation de l'installation npm à partir de n8n 3.0. Pour cette V1, les workflows ciblent les types de nœuds de n8n 2.x. Il faut confirmer l'import et le fonctionnement sur la version retenue au lycée. Ne pas faire télécharger toutes les dépendances pendant la séance. La documentation consultée indique Node.js 20.19 à 24.x pour l'installation npm.

Ouvrir http://localhost:5678 et terminer la création du compte local si n8n le demande. Ne pas créer d'abonnement n8n Cloud pour cette activité.

Créer un compte sur [Groq Console](https://console.groq.com/), rester sur le Free Plan et créer une clé dans API Keys. Vérifier que openai/gpt-oss-20b est accessible dans ce compte. Aucun modèle n'est téléchargé sur le poste. Le gratuit est soumis à des quotas ; plusieurs clés de la même organisation partagent les limites. Vérifier les conditions de compte applicables aux étudiants avant la diffusion.

Tester depuis le réseau du lycée l'accès HTTPS à api.groq.com. Un réseau local fermé entre postes n'empêche pas ce montage si la sortie Internet est autorisée. Les logs fournis sont entièrement fictifs.

## 3. Tester uniquement la liaison locale

1. Dans n8n, créer un workflow et utiliser son menu Import from file.
2. Importer workflows/00-test-connexion.json depuis le dossier du projet (également disponible au téléchargement ci-dessous).
3. Ouvrir le nœud Réception des logs. Vérifier HTTP Method = POST et Respond = Using Respond to Webhook Node.
4. Cliquer sur Listen for test event. Copier la Test URL affichée.
5. Dans CyberEscape, passer à Mon workflow n8n + Groq et coller cette URL. Cliquer sur Tester la connexion.
6. Le message Connexion réussie doit apparaître. Ce test ne consomme aucun appel Groq.

Téléchargement : [workflow de connexion](/workflows/00-test-connexion.json).

Une URL webhook-test demande de relancer l'écoute n8n avant chaque appel. Pour répéter facilement les essais, enregistrer puis activer/publier le workflow et copier la Production URL, contenant /webhook/. Une URL de production ne fonctionne que si le workflow est actif. Ne garder qu'un workflow actif sur le chemin cyberescape. Arrêter le workflow de connexion avant d'activer le corrigé ou le squelette.

## 4. Essayer le corrigé avec le vrai LLM

1. Importer enseignant/02-corrige-complet.json, disponible sur le disque, pas dans les téléchargements du sujet élève.
2. Ouvrir Analyser avec Groq. Authentication doit être Generic Credential Type, puis Header Auth.
3. Créer un identifiant Header Auth. Name : Authorization. Value : Bearer suivi d'un espace et de ta clé personnelle Groq. Ne pas placer la clé dans le corps JSON ni dans l'interface du jeu.
4. Vérifier POST et l'URL https://api.groq.com/openai/v1/chat/completions. Le corps JSON est déjà fourni par Préparer la requête.
5. Enregistrer. Activer/publier le workflow, puis recopier sa Production URL dans le jeu (ou écouter la Test URL avant chaque envoi).
6. Cliquer d'abord sur Tester la connexion. La branche PING doit répondre ready sans passer par Groq.
7. Lancer SOC-01. Ouvrir les exécutions n8n et observer le corps entrant, la requête préparée, l'objet extrait et la branche choisie.
8. Faire les six dossiers. En cas de mauvaise analyse, noter les logs, le JSON, le temps d'attente et le modèle utilisé. Une réponse structurée ne garantit pas un bon diagnostic.

Les instructions corrigées se trouvent dans enseignant/agent-corrige.md ; les réponses de référence et les critères dans enseignant/reponses.json. Ne pas remplacer les résultats du LLM par ces réponses pendant le test réel.

## 5. Tester le parcours élève

Recommencer le parcours local, désactiver le corrigé, importer workflows/01-squelette-eleve.json et suivre le sujet élève sans consulter les réponses. Le squelette contient le transport HTTP, le schéma strict et la vérification des preuves ; l'élève complète les instructions et construit les conditions et les champs action.

Ce choix réduit les manipulations techniques peu utiles pour un premier TP. Pour un public avancé, le bonus consiste à reconstruire Préparer la requête depuis le contrat fourni.

Le fichier agent-a-completer.md n'est pas lu automatiquement : son texte final doit être collé dans le champ instructions du nœud Instructions analyste. Modifier le fichier seul ne change pas le comportement du modèle.

## 6. Organisation et durée à mesurer

- Avant séance : comptes, clé API, installation et test réseau.
- 0–10 min : lecture de la mission, réception d'un webhook, inspection du JSON.
- 10–25 min : instructions du modèle, schéma et premières preuves.
- 25–40 min : branches IF et actions, validation du premier dossier.
- 40–65 min : panne, SQL et faux positif ; correction des règles.
- 65–80 min : injection de prompt et corrélation finale.
- 80–90 min : export et explication des choix ; bonus si disponible.

Les temps inscrits sur les dossiers sont des repères, pas des délais imposés ; la construction initiale sert ensuite à toutes les missions. Aucune estimation ne garantit qu'un élève rapide mettra une heure. Mesurer pendant ton essai et faire ensuite un pilote avec un élève. Si le TP est trop court, ajouter un transfert sur logs inédits et une justification écrite, plutôt qu'un temps d'attente artificiel.

## 7. Évaluation formative proposée

L'application affiche cinq contrôles de 20 points par dossier. Elle conserve le meilleur résultat et le nombre d'essais, sans pénalité pour les indices. Les résumés ne sont pas comparés mot pour mot. Les preuves sont vérifiées dans les traces et doivent couvrir les faits décisifs. Les risques sont fixés par les conventions simplifiées du TP ; medium et high sont tous deux acceptés pour l'injection de prompt.

Pour une note sur 20 : fonctionnement du workflow 6, qualité des instructions 5, six dossiers et preuves 5, explication d'un faux positif et d'une limite du LLM 4. Ce barème enseignant est distinct du score de diagnostic de l'application.

L'accès à la mission suivante nécessite une validation dans le mode en cours. On peut revenir aux dossiers déjà ouverts. Le mode démo, les fichiers locaux et les appels de validation permettent d'inspecter les réponses : ce prototype n'est pas conçu pour un examen sans accès au corrigé.

## 8. Dépannage

- Page inaccessible : vérifier que la console node server.js est ouverte et que le port 8080 est libre. Ne pas ouvrir index.html par double-clic : le serveur est nécessaire.
- fetch failed / connexion refusée : vérifier que n8n tourne et que l'URL commence par http://localhost:5678 ou http://127.0.0.1:5678.
- HTTP 404 : URL de test sans écoute, mauvais chemin ou workflow de production inactif.
- Test ready absent : mauvaise branche PING, ancien workflow de connexion actif ou réponse non configurée.
- HTTP 401 côté Groq : vérifier Header Auth, l'espace après Bearer et la validité de la clé.
- HTTP 400 côté Groq : ouvrir l'erreur dans n8n ; vérifier le modèle, json_schema et strict. Choisir un autre modèle compatible uniquement après avoir vérifié ses capacités et ses quotas.
- HTTP 429 : attendre selon le délai indiqué par Groq, puis relancer manuellement. Éviter les boucles automatiques et le spam du bouton.
- Analyse tronquée : le code refuse finish_reason différent de stop ; vérifier la limite de tokens. L'augmenter consomme davantage de quota.
- Preuves invalides : demander des citations exactes, conserver les encodages d'URL et choisir des extraits distincts. Un schéma strict n'impose pas leur présence dans les logs.
- Format final invalide : ne pas renvoyer choices, body, request ou instructions ; conserver uniquement les sept champs du protocole, dont action.
- Attente supérieure à 65 secondes : consulter l'exécution n8n avant de retenter. Le modèle et l'API n'offrent pas une garantie de latence pour la classe.

## 9. Sources techniques

Documentation vérifiée le 8 novembre 2026 ; les offres et interfaces peuvent changer.

- [Installation n8n](https://docs.n8n.io/hosting/installation/npm/)
- [Webhook n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [HTTP Request n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Démarrage Groq](https://console.groq.com/docs/quickstart)
- [JSON structuré Groq](https://console.groq.com/docs/structured-outputs)
- [Quotas Groq](https://console.groq.com/docs/rate-limits)

## 10. État de vérification

Le mode démo, le serveur, la validation et les ressources font l'objet de vérifications locales. L'import dans une instance n8n et les réponses d'une vraie clé Groq doivent être confirmés pendant ton essai. La compatibilité exacte dépend de la version installée et du modèle disponible.
