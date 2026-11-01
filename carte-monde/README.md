# Carte du monde

Application mobile minimale (Expo SDK 54 / React Native) : une seule page avec une carte du monde interactive.

## Lancer le projet

1. Installer Node.js LTS 18 ou plus récent (https://nodejs.org).
2. Installer **Expo Go** sur ton téléphone.
3. Dans un terminal, depuis ce dossier :

```bash
npm install
npx expo install --fix
npx expo start --clear
```

4. Scanne le QR code (appareil photo sur iPhone, Expo Go sur Android).

Téléphone et ordinateur doivent être sur le même Wi-Fi. Si ça ne se connecte pas, essaie `npx expo start --tunnel`.

## Si Expo Go affiche une erreur

- Le projet est en **SDK 54**. Expo Go doit être compatible avec cette version (sur iPhone, la version App Store est en SDK 54).
- Lance `npx expo-doctor@latest` pour détecter les problèmes de dépendances.
- Relance avec `npx expo start --clear` pour vider le cache.
- Note le texte exact de l'erreur (affiché sur le téléphone et dans le terminal) pour diagnostiquer.

## Organisation du code

`App.js` assemble les fonctionnalités de l'application. Les composants, leur logique et leurs styles sont regroupés sous `features/` : recherche de lieux, activités Garmin, carte et profils d'activité. La région initiale et le type de carte sont définis dans `features/map/ActivityMap.js`.

## Activités Garmin

Le backend local garde la clé personnelle Garmin hors de l'application mobile.

1. Crée une clé personnelle Garmin depuis les paramètres Garmin Connect.
2. Copie `.env.example` vers `.env` (`Copy-Item .env.example .env` sous PowerShell) et renseigne `GARMIN_PERSONAL_API_KEY`.
3. Dans un terminal, lance `npm run server`.
4. Dans un autre terminal, lance Expo avec `npx expo start`.

Le menu « Charger mes activités Garmin » récupère les activités cyclistes et les trie de la plus récente à la plus ancienne. La liste est conservée en cache sur l'appareil et réutilisée lors des prochaines ouvertures; le bouton d'actualisation permet de récupérer les dernières activités. La recherche dans la liste accepte une date au format `JJ/MM/AAAA` ou `AAAA-MM-JJ`, ainsi qu'une partie de date. Le choix d'une activité charge son parcours GPS, son profil altimétrique et ses données de vitesse et de fréquence cardiaque depuis le fichier FIT Garmin. Ces profils, affichés dans un panneau repliable en bas de la carte, présentent les grandeurs selon la distance en kilomètres. Déplace le curseur sur le profil altimétrique pour faire suivre un marqueur sur le parcours de la carte. Pour Expo Go sur un téléphone physique, configure `EXPO_PUBLIC_GARMIN_SERVER_URL` dans `.env` avec l'adresse IP locale de l'ordinateur, par exemple `http://192.168.1.10:3001`, et règle `GARMIN_SERVER_HOST=0.0.0.0`. Pour un émulateur Android, utilise `http://10.0.2.2:3001`. Utilise ce backend uniquement sur un réseau de confiance; ne l'expose pas sur Internet.

La clé Garmin est disponible et révocable depuis les réglages Personal API de Garmin Connect. La documentation officielle décrit son échange contre un jeton d'accès temporaire : https://developer.garmin.com/gc-developer-program/personal/personal-api/

Pour tester le connecteur : `npm run test:garmin`.
