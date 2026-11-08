# Contrat d'échange CyberEscape V1

## Circuit

Le navigateur appelle le serveur local CyberEscape. Celui-ci relaie le JSON au webhook n8n local. n8n appelle Groq avec sa clé, extrait et vérifie l'analyse, calcule l'action puis répond. Le navigateur demande la vérification pédagogique au serveur local.

## Entrée webhook

```json
{
  "incident_id": "SOC-01",
  "context": "Contexte fourni par l'organisateur",
  "asset": "auth-01",
  "logs": "Plusieurs lignes de texte séparées par des retours à la ligne"
}
```

Le test de connexion utilise kind = connection_test et attend un objet contenant status = ready. Cette branche doit précéder tout appel Groq.

## Sortie LLM

Le modèle renvoie category, risk, source_ip, summary et evidence. Le schéma strict n'autorise pas de champs supplémentaires. Tous les champs sont requis, source_ip peut valoir null. Le fichier workflows/schema-analyse.json constitue le schéma transmis à Groq. Le workflow ajoute incident_id depuis le webhook et action depuis ses règles.

## Réponse finale n8n

```json
{
  "incident_id": "SOC-01",
  "category": "brute_force",
  "risk": "high",
  "source_ip": "192.0.2.45",
  "summary": "Tentatives répétées depuis une source unique, sans succès observé.",
  "evidence": [
    "Failed password for admin from 192.0.2.45",
    "Failed password for root from 192.0.2.45"
  ],
  "action": "block_ip"
}
```

- category : normal, brute_force, sql_injection ou prompt_injection.
- risk : low, medium, high ou critical.
- source_ip : IPv4 pertinente, ou null en l'absence de source pertinente. Les adresses sont réservées à la documentation.
- summary : texte libre de 15 à 600 caractères. Le sens du résumé nécessite une lecture humaine : le validateur automatique ne prétend pas le vérifier.
- evidence : 2 à 4 extraits exacts distincts, de 12 caractères minimum, présents dans les logs. Les faits décisifs doivent être couverts.
- action : observe, block_ip ou escalate.

## Règles déterministes et ordre

1. category = prompt_injection OU risk = critical : escalate.
2. risk = high ET source_ip = null : escalate.
3. risk = high avec IP : block_ip.
4. Tous les autres cas : observe.

Il s'agit de règles d'exercice, pas d'une politique de sécurité applicable en production. observe ne répare pas une panne et escalate ne prouve pas qu'un humain a traité le dossier.

## Validation et persistance

Les cinq vérifications concernent le contrat et l'identifiant, la catégorie, le risque et la source, les preuves, l'action. Un contrat invalide vaut 0 ; sinon chaque vérification réussie vaut 20. Le meilleur score et les succès sont conservés localement dans le navigateur, séparés entre démo et réel. Les nouvelles missions sont débloquées après succès ; les missions précédentes restent accessibles. Aucun compte élève central ni envoi au professeur n'est implémenté.

Le résumé n'est pas noté mot pour mot. Les catégories attendues restent volontairement fermées pour permettre une vérification claire. Certaines analyses plausibles peuvent nécessiter une discussion avec l'enseignant : cette limite sera à réviser après le pilote.

## Fiabilité

Schéma strict = structure contrôlée, pas vérité garantie. Le workflow refuse aussi les citations absentes des logs. Il utilise un seul appel LLM par analyse ; pas de mémoire conversationnelle ni de reprise autonome. Les erreurs et les quotas sont visibles dans les exécutions n8n. Le serveur local attend jusqu'à 65 secondes ; l'appel Groq dans le workflow jusqu'à 55 secondes.

## Gratuité et fonctionnement local

L'interface et le relais ne dépendent d'aucun paquet externe et ne chargent aucun service de police ou d'image. n8n et Node.js tournent sur le poste ; Groq est distant et demande Internet. Les quotas Groq sont ceux de l'organisation, pas ceux d'une clé individuelle. Rester sur le Free Plan et vérifier les limites avant la séance.
