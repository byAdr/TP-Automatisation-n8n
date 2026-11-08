# Vérifications de la V1

Vérification locale du 8 novembre 2026.

- 13 tests automatiques réussis : six réponses de référence, refus de JSON erronés, faux diagnostics, règles prioritaires, structure des workflows, exécution de leurs codes avec réponses simulées et relais vers un faux webhook HTTP local.
- Contrôle syntaxique JavaScript et contrôle des espaces du diff réussis.
- Six dossiers parcourus en mode démonstration dans le navigateur : validation et déblocage successif jusqu'à la fin.
- Séparation des progressions démo/réel observée ; la démo ne fait pas progresser le parcours réel.
- Affichage contrôlé dans la fenêtre étroite du navigateur et à 1440 px ; logs avec retour à la ligne, panneaux empilés sur petit écran.
- Cours texte chargé et lu dans le lecteur de documentation.
- Parcours remis à zéro après les essais pour laisser un premier dossier vierge à l'utilisateur.

Non vérifié : import effectif dans n8n (aucune instance disponible pendant la création), accès Groq avec une vraie clé, latence et quotas pour une classe, durée réelle d'un élève. Les tests exécutent le code des nœuds avec des données simulées ; ils ne constituent pas une exécution dans n8n. Le guide enseignant décrit le test réel à faire.

Le prototype ne contient aucune clé API. Les réponses de référence restent des conventions pédagogiques, pas un moteur de détection de sécurité utilisable en production.
