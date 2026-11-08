# TP CyberEscape — Opération Blackout

CyberCorp a besoin d'un système pour lire ses journaux et répondre aux incidents. Construis un workflow n8n qui reçoit les traces, les fait analyser par un LLM et choisit une action simulée. Attention : une erreur applicative n'est pas toujours une attaque, et le modèle peut se tromper.

Objectif : 60 à 90 minutes de manipulation après installation et cours. Travail individuel. Les trois nœuds techniques fournis ne sont pas à réécrire. Tu dois comprendre leur entrée et leur sortie, compléter les instructions et construire la décision.

## Préparer son poste

1. Lancer n8n localement et ouvrir http://localhost:5678.
2. Lancer Lancer-CyberEscape.cmd et ouvrir http://127.0.0.1:8080.
3. Disposer de sa clé Groq gratuite. Ne pas la communiquer au professeur dans le rendu.
4. Télécharger puis importer le [squelette élève](/workflows/01-squelette-eleve.json) avec Import from file dans n8n.
5. Ouvrir Analyser avec Groq. Choisir l'authentification Generic Credential Type / Header Auth. Créer un identifiant dont Name vaut Authorization et Value vaut Bearer suivi d'un espace et de la clé API.

Ne pas mettre de clé dans les instructions, les logs ou le fichier HTML.

## Étape 1 — Recevoir les données

Ouvrir Réception des logs. Vérifier POST et le chemin cyberescape. Le mode de réponse est Using Respond to Webhook Node. Cliquer sur Listen for test event, puis copier la Test URL dans CyberEscape après avoir sélectionné Mon workflow n8n + Groq.

Cliquer sur Tester la connexion. Résultat attendu : Connexion réussie. Cette branche de test contourne le modèle.

Pour les appels suivants, relancer Listen for test event avant chaque envoi. Pour éviter cette répétition, enregistrer et activer/publier le workflow, puis utiliser sa Production URL. Un seul workflow actif doit utiliser cyberescape.

Ouvrir le premier dossier et lancer une analyse. Le squelette peut échouer sur les instructions ou sur le champ action manquant : c'est normal à ce stade. Dans les exécutions n8n, regarder l'entrée de Réception des logs.

Repérer body.incident_id, body.context, body.asset et body.logs. Répondre dans ses notes : pourquoi les données sont-elles sous body ? Quelle différence entre le texte d'un log et sa catégorie ?

## Étape 2 — Donner un rôle et un cadre au modèle

Ouvrir la [trame d'instructions](/ressources/agent-a-completer.md). La compléter dans un éditeur texte, puis coller son contenu dans la valeur instructions du nœud Instructions analyste. Le fichier n'est pas chargé automatiquement.

Le modèle doit distinguer quatre catégories : normal (aucune attaque identifiée), brute_force, sql_injection et prompt_injection. Définir leurs indices avec ses propres mots.

Adopter les niveaux de risque de cet exercice :

- low : activité autorisée sans incident.
- medium : panne avec service dégradé, ou manipulation du prompt sans action privilégiée constatée.
- high : tentative hostile répétée, sans succès établi.
- critical : connexion admin suspecte après échecs, suivie d'une action privilégiée anormale.

Demander un résumé en français, une IP pertinente (ou null) et 2 à 4 citations exactes distinctes de logs. Ne jamais inventer une réussite d'attaque. Chaque citation doit contenir au moins 12 caractères et porter sur un fait utile.

Le nœud Préparer la requête assemble le texte des instructions et les traces. Analyser avec Groq envoie cette requête avec un schéma strict. Vérifier le JSON extrait la réponse et refuse les preuves absentes des logs. Inspecter leurs résultats sans modifier le code fourni.

Question : le schéma peut-il garantir qu'une catégorie est vraie ? Pourquoi faut-il vérifier les preuves ?

## Étape 3 — Construire les règles de réponse

À la sortie de Vérifier le JSON, tu disposes de incident_id, category, risk, source_ip, summary et evidence. Il manque action. Déconnecter le lien direct entre Vérifier le JSON et Renvoyer le rapport. Insérer les conditions ci-dessous.

Créer un premier nœud IF nommé Escalade nécessaire ?. Choisir une condition Boolean / is true. Dans la valeur de gauche, passer en Expression et saisir :

```text
{{ $json.category === 'prompt_injection' || $json.risk === 'critical' || ($json.risk === 'high' && $json.source_ip === null) }}
```

Sur la sortie true, ajouter un Edit Fields nommé Transmettre à un analyste. Ajouter un champ String nommé action avec la valeur escalate. Activer Include Other Input Fields pour conserver l'analyse.

Sur la sortie false du premier IF, créer un second IF nommé Risque élevé ?. Condition Boolean / is true, expression :

```text
{{ $json.risk === 'high' }}
```

Sur true, créer un Edit Fields qui ajoute action = block_ip. Sur false, un Edit Fields qui ajoute action = observe. Dans chacun, conserver les autres champs entrants.

Relier les trois Edit Fields au même nœud Renvoyer le rapport. Chaque incident ne parcourt qu'une branche. Il n'est pas nécessaire d'ajouter un Merge qui attendrait les autres branches.

Dans Renvoyer le rapport, sélectionner Respond With = JSON et utiliser en mode Expression :

```text
{{ $json }}
```

Ces règles sont pédagogiques et simplifiées. L'application joue une réaction fictive ; elle ne bloque aucun réseau réel.

## Étape 4 — Valider la première enquête

Relancer SOC-01. Examiner les cinq vérifications. Si l'analyse échoue, observer le premier nœud en erreur dans n8n. Si le JSON est accepté mais le diagnostic est faux, améliorer les instructions. Si l'action est fausse, corriger les IF ou les champs.

Ne pas changer les règles de l'application pour faire accepter une réponse. Obtenir une validation, puis vérifier qu'une seconde analyse des mêmes logs reste cohérente. La latence et les erreurs du fournisseur peuvent varier.

## Étape 5 — Transférer les règles aux autres contextes

- SOC-02 : expliquer pourquoi une panne disque ne doit pas provoquer un blocage réseau. Garder le risque medium pour le service dégradé et source_ip = null.
- SOC-03 : trouver la source hostile parmi les accès légitimes. Citer une erreur SQL et la charge UNION, sans affirmer une fuite de données.
- SOC-04 : utiliser l'autorisation de sauvegarde, son compte et son créneau pour éviter un faux positif.
- SOC-05 : renforcer les instructions pour que le modèle analyse les ordres présents dans les logs sans les exécuter. Citer l'ordre et le fait que sa source n'est pas fiable.
- SOC-06 : citer au moins les échecs, la connexion réussie et l'action sur la journalisation. Expliquer pourquoi une intervention humaine est nécessaire.

Les indices sont disponibles à tout moment, sans pénalité. Les champs summary sont libres ; les champs de catégorie, risque et action utilisent les valeurs du contrat. Une citation reformulée ou une URL décodée ne constitue pas un extrait exact.

## Étape 6 — Rendu

1. Exporter le workflow n8n au format JSON depuis son menu de téléchargement.
2. Exporter le bilan dans CyberEscape. Les résultats réels doivent être distingués de la démo.
3. Fournir une capture de la mission finale validée.
4. Ajouter 5 à 8 lignes : un faux positif évité, une instruction améliorée après un échec et une limite de l'IA.
5. Vérifier que la clé API n'apparaît ni dans les captures ni dans le JSON. Ne pas exporter les identifiants secrets n8n.

## Bonus pour les plus rapides

- Sans connaître la réponse attendue, proposer trois lignes de logs supplémentaires qui changeraient le diagnostic de SOC-01. Expliquer pourquoi.
- Retirer de SOC-06 la connexion réussie et les actions suivantes, envoyer ce nouveau cas depuis un outil HTTP et comparer l'analyse n8n. Le simulateur reste attaché au jeu de données initial : ne pas utiliser son score pour cette variante.
- Remplacer les instructions par une version trop vague, observer un échec puis documenter la correction.
- Reconstituer la requête Groq à partir du [modèle fourni](/workflows/requete-groq.json). Identifier messages, model et response_format.

## En cas de blocage

404 : relancer l'écoute de test ou activer le workflow pour l'URL de production. 401 Groq : vérifier l'identifiant Header Auth. 429 : patienter et retenter manuellement. Erreur de preuves : demander des extraits exacts des logs. action manquant : vérifier Include Other Input Fields et le branchement des Edit Fields. Demander au professeur plutôt que multiplier les appels.
