const SERVER_URL =
  process.env.EXPO_PUBLIC_GARMIN_SERVER_URL || 'http://localhost:3001';

export default class GarminService {
  constructor(serverUrl = SERVER_URL) {
    this.serverUrl = serverUrl.replace(/\/+$/, '');
  }

  async getCyclingActivities() {
    let response;
    try {
      response = await fetch(`${this.serverUrl}/api/garmin/activities`);
    } catch {
      throw new Error(
        'Impossible de joindre le serveur Garmin. Vérifiez son démarrage et son adresse réseau.'
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('Le serveur Garmin a renvoyé une réponse invalide.');
    }

    if (!response.ok) {
      throw new Error(payload.error || `Le serveur Garmin a répondu HTTP ${response.status}.`);
    }
    if (!Array.isArray(payload.activities)) {
      throw new Error('La liste des activités reçue du serveur est invalide.');
    }

    return payload.activities;
  }

  async getActivityTrack(activityId) {
    let response;
    try {
      response = await fetch(
        `${this.serverUrl}/api/garmin/activities/${encodeURIComponent(activityId)}/track`
      );
    } catch {
      throw new Error(
        'Impossible de récupérer le tracé. Vérifiez la connexion au serveur Garmin.'
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('Le serveur Garmin a renvoyé une réponse invalide pour le tracé.');
    }

    if (!response.ok) {
      throw new Error(payload.error || `Le serveur Garmin a répondu HTTP ${response.status}.`);
    }
    if (
      !Array.isArray(payload.coordinates) ||
      payload.coordinates.length < 2 ||
      !payload.coordinates.every(
        (coordinate) =>
          Number.isFinite(coordinate.latitude) &&
          Number.isFinite(coordinate.longitude)
      )
    ) {
      throw new Error('Le tracé GPS reçu du serveur est invalide.');
    }

    if (
      !Array.isArray(payload.elevationProfile) ||
      !payload.elevationProfile.every(
        (point) =>
          Number.isFinite(point.distance) &&
          Number.isFinite(point.altitude) &&
          point.distance >= 0 &&
          (point.coordinate == null ||
            (Number.isFinite(point.coordinate.latitude) &&
              Number.isFinite(point.coordinate.longitude) &&
              point.coordinate.latitude >= -90 &&
              point.coordinate.latitude <= 90 &&
              point.coordinate.longitude >= -180 &&
              point.coordinate.longitude <= 180))
      )
    ) {
      throw new Error('Le profil altimétrique reçu du serveur est invalide.');
    }

    const performanceProfile =
      payload.performanceProfile === undefined ? [] : payload.performanceProfile;
    if (
      !Array.isArray(performanceProfile) ||
      !performanceProfile.every(
        (point) =>
          Number.isFinite(point.distance) &&
          point.distance >= 0 &&
          (point.speed == null ||
            (Number.isFinite(point.speed) && point.speed >= 0)) &&
          (point.heartRate == null ||
            (Number.isFinite(point.heartRate) && point.heartRate > 0)) &&
          (point.speed != null || point.heartRate != null)
      )
    ) {
      throw new Error(
        'Le profil de vitesse et de fréquence cardiaque reçu du serveur est invalide. Redémarrez le serveur Garmin et réessayez.'
      );
    }

    return { ...payload, performanceProfile };
  }
}
