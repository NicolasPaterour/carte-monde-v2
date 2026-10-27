const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { GarminPersonalApi, GarminApiError } = require('./GarminPersonalApi');

loadEnvironment();

const host = process.env.GARMIN_SERVER_HOST || '127.0.0.1';
const port = Number(process.env.GARMIN_SERVER_PORT || 3001);
const allowedOrigins = new Set(
  (process.env.GARMIN_CORS_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
let garminClient;

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.writeHead(204).end();
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Méthode non autorisée.' });
    return;
  }

  if (request.url === '/api/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  try {
    if (request.url === '/api/garmin/activities') {
      const activities = await getGarminClient().getCyclingActivities();
      sendJson(response, 200, { activities });
      return;
    }

    const trackMatch = request.url.match(/^\/api\/garmin\/activities\/(\d+)\/track$/);
    if (trackMatch) {
      const activityTrack = await getGarminClient().getActivityTrack(trackMatch[1]);
      sendJson(response, 200, activityTrack);
      return;
    }

    sendJson(response, 404, { error: 'Route introuvable.' });
  } catch (error) {
    const statusCode = error instanceof GarminApiError ? error.statusCode : 503;
    const message =
      error instanceof Error
        ? error.message
        : 'Erreur inattendue lors de la connexion à Garmin.';
    console.error(`Erreur Garmin API: ${message}`);
    sendJson(response, statusCode, { error: message });
  }
});

server.listen(port, host, () => {
  console.log(`Backend Garmin disponible sur http://${host}:${port}`);
});

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode);
  response.end(JSON.stringify(body));
}

function getGarminClient() {
  if (!garminClient) {
    garminClient = new GarminPersonalApi(process.env.GARMIN_PERSONAL_API_KEY);
  }
  return garminClient;
}

function loadEnvironment() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith('#') || process.env[match[1]] !== undefined) {
      continue;
    }

    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
}
