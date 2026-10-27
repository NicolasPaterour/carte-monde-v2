const DEFAULT_BASE_URL = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const ACTIVITIES_PATH = '/activitylist-service/activities/search/activities';
const ACTIVITY_DOWNLOAD_PATH = '/download-service/files/activity';
const PAGE_SIZE = 100;
const MAX_DOWNLOAD_SIZE = 25 * 1024 * 1024;
const { URL } = require('node:url');
const { decodeActivityArchive } = require('./activityTrack');

class GarminApiError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'GarminApiError';
    this.statusCode = statusCode;
  }
}

class GarminPersonalApi {
  constructor(
    apiKey,
    {
      fetchImpl = globalThis.fetch,
      baseUrl = DEFAULT_BASE_URL,
      decodeFitArchive = decodeActivityArchive,
    } = {}
  ) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('GARMIN_PERSONAL_API_KEY est manquant.');
    }

    this.apiKey = apiKey.trim();
    this.fetch = fetchImpl;
    this.decodeFitArchive = decodeFitArchive;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  async getCyclingActivities() {
    const activities = [];
    let start = 0;

    while (true) {
      const page = await this.fetchActivitiesPage(start);
      activities.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }
      start += page.length;
    }

    return activities
      .filter(isCyclingActivity)
      .map(normalizeActivity)
      .filter(Boolean)
      .sort((left, right) => Date.parse(right.startTime) - Date.parse(left.startTime));
  }

  async getActivityTrack(activityId) {
    if (!/^\d+$/.test(String(activityId))) {
      throw new GarminApiError('Identifiant d’activité invalide.', 400);
    }

    const archive = await this.downloadActivityFile(activityId);
    try {
      return await this.decodeFitArchive(archive);
    } catch (error) {
      if (error instanceof GarminApiError) {
        throw error;
      }
      throw new GarminApiError(
        error instanceof Error
          ? error.message
          : 'Impossible de lire le tracé GPS de cette activité.',
        404
      );
    }
  }

  async downloadActivityFile(activityId) {
    const url = new URL(
      `${ACTIVITY_DOWNLOAD_PATH}/${activityId}`,
      this.baseUrl
    );

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const accessToken = await this.getAccessToken();
      const response = await this.fetch(url, {
        headers: {
          Accept: 'application/zip, application/x-zip-compressed, application/octet-stream',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401 && attempt === 0) {
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        continue;
      }
      if (!response.ok) {
        throw new GarminApiError(`Garmin a refusé le téléchargement (HTTP ${response.status}).`);
      }

      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > MAX_DOWNLOAD_SIZE) {
        throw new GarminApiError('Le fichier Garmin dépasse la taille maximale autorisée.', 413);
      }

      const archive = new Uint8Array(await response.arrayBuffer());
      if (!archive.length || archive.length > MAX_DOWNLOAD_SIZE) {
        throw new GarminApiError('Le fichier Garmin est vide ou trop volumineux.', 413);
      }

      return archive;
    }

    throw new GarminApiError('Impossible de renouveler le jeton Garmin.');
  }

  async fetchActivitiesPage(start) {
    const url = new URL(ACTIVITIES_PATH, this.baseUrl);
    url.searchParams.set('start', String(start));
    url.searchParams.set('limit', String(PAGE_SIZE));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const accessToken = await this.getAccessToken();
      const response = await this.fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401 && attempt === 0) {
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        continue;
      }
      if (!response.ok) {
        throw new GarminApiError(`Garmin a refusé la requête (HTTP ${response.status}).`);
      }

      try {
        return extractActivities(await response.json());
      } catch (error) {
        if (error instanceof GarminApiError) {
          throw error;
        }
        throw new GarminApiError('Garmin a renvoyé une réponse JSON invalide.');
      }
    }

    throw new GarminApiError('Impossible de renouveler le jeton Garmin.');
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiresAt - Date.now() > 60 * 60 * 1000) {
      return this.accessToken;
    }

    const response = await this.fetch(new URL(TOKEN_PATH, this.baseUrl), {
      method: 'POST',
      headers: {
        Accept: '*/*',
        Authorization: `ApiKey ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new GarminApiError(
        `Impossible d’obtenir un jeton Garmin (HTTP ${response.status}). Vérifiez la clé et sa date d’expiration.`,
        502
      );
    }

    const accessToken = (await response.text()).trim();
    const expiration = getJwtExpiration(accessToken);
    if (!accessToken || !expiration) {
      throw new GarminApiError('Garmin a renvoyé un jeton d’accès invalide.');
    }

    this.accessToken = accessToken;
    this.tokenExpiresAt = expiration;
    return accessToken;
  }
}

function extractActivities(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.activities)) {
    return payload.activities;
  }
  if (payload && Array.isArray(payload.activityList)) {
    return payload.activityList;
  }

  throw new GarminApiError('Format de réponse Garmin inattendu pour les activités.');
}

function isCyclingActivity(activity) {
  const activityType = activity?.activityType;
  const typeKey =
    typeof activityType === 'string'
      ? activityType
      : activityType?.typeKey || activityType?.type || activity?.activityTypeKey || '';

  return /cycl|bik|virtual_ride/i.test(typeKey);
}

function normalizeActivity(activity) {
  const id = activity.activityId ?? activity.id;
  const rawStartTime =
    activity.startTimeGMT ??
    activity.startTimeLocal ??
    (Number.isFinite(activity.startTimeInSeconds)
      ? activity.startTimeInSeconds * 1000
      : null);
  const timestamp =
    typeof rawStartTime === 'number' ? rawStartTime : Date.parse(rawStartTime);

  if (id == null || !Number.isFinite(timestamp)) {
    return null;
  }

  return {
    id: String(id),
    name: String(activity.activityName || activity.name || 'Sortie vélo'),
    startTime: new Date(timestamp).toISOString(),
  };
}

function getJwtExpiration(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

module.exports = { GarminPersonalApi, GarminApiError };
