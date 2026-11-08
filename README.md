# CyberEscape — Opération Blackout

TP individuel n8n + Groq : six enquêtes sur des logs fictifs. Première version à tester avant diffusion. Sans diaporama.

## Essayer

1. Double-cliquer sur **Lancer-CyberEscape.cmd**, ou lancer `node server.js` dans ce dossier (Node.js 20 ou supérieur requis).
2. Ouvrir **http://127.0.0.1:8080** et garder la console ouverte.
3. En **Démonstration**, cliquer sur **Analyser les logs**. Aucune clé API nécessaire ; les réponses sont simulées et ne valident pas le parcours réel.
4. Ouvrir **Guide de test** pour brancher le workflow n8n et sa clé Groq.

## Documents

- [Guide enseignant](docs/GUIDE-ENSEIGNANT.md) : installation, connexion, corrigé et dépannage.
- [Sujet élève](docs/TP-ELEVE.md) : parcours pas à pas, hypothèse de 60–90 minutes hors installation.
- [Cours texte](docs/COURS.md) : introduction et propositions d'illustrations décrites en texte.
- [Protocole](docs/PROTOCOLE.md) : schéma et critères de validation.
- [Retour de test](docs/RETOUR-TEST.md) : grille pour relever les améliorations.

Tous ces documents se lisent aussi dans le navigateur via le guide de l'application.

## Ressources

- `workflows/00-test-connexion.json` : vérifier la liaison sans Groq.
- `workflows/01-squelette-eleve.json` : appel structuré fourni, instructions et décisions à compléter.
- `workflows/requete-groq.json` et `schema-analyse.json` : référence de la requête stricte.
- `ressources/agent-a-completer.md` : trame d'instructions à coller dans n8n.
- `enseignant/02-corrige-complet.json` : workflow corrigé à importer depuis le disque.
- `enseignant/agent-corrige.md` et `reponses.json` : instructions et attentes pédagogiques.

Le relais local évite les réglages CORS et n'autorise que les webhooks HTTP de localhost/127.0.0.1. La clé Groq reste dans n8n. Aucun paquet externe, aucune police distante dans le simulateur. Groq nécessite Internet et reste gratuit sous les quotas du Free Plan ; les modèles disponibles peuvent changer.

Le mode démo et les fichiers locaux rendent les réponses inspectables : il s'agit d'un support d'apprentissage, pas d'une plateforme d'examen sécurisée. Les actions sont entièrement simulées. Le résumé nécessite une relecture humaine ; la validation automatique ne certifie pas son sens.

## Vérification et limites

`npm test` ou `node --test tests/cyberescape.test.js`

Les tests couvrent les six références, les refus d'analyses erronées, les codes et conditions du workflow et le relais avec un faux webhook local. Ils ne remplacent pas un import dans n8n et un appel à Groq avec une vraie clé. Les workflows ciblent n8n 2.x et doivent être essayés sur la version du lycée. Aucun délai pédagogique minimum ne peut être garanti avant un pilote.

Les fichiers workflows sont reproductibles avec `node outils/generer-workflows.js` (les modifications manuelles à ces fichiers sont alors remplacées).

## Direction graphique

Produit : console d'enquête pour BTS SIO. Caractère : posé, précis, investigateur. Univers : dossiers d'incidents et journaux de supervision. Moment visuel : traces chronologiques et décision argumentée. Signature : numéro de dossier dans la navigation, les logs et le rapport.

Écran créé à neuf, sans interface existante à auditer. Grille de 4 px, surfaces graphite, accent ambre, texte et états sémantiques, pas de décor ni animation en boucle. Conception guidée par **unslop**, de [Damir Sokolovsky](https://heydamir.design/unslop), CC BY 4.0. Aucun fichier de cette compétence n'est redistribué.
