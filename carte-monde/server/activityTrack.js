const { unzipSync } = require('fflate');

const MAX_ARCHIVE_SIZE = 25 * 1024 * 1024;
const MAX_FIT_FILE_SIZE = 100 * 1024 * 1024;
const SEMICIRCLES_TO_DEGREES = 180 / 2 ** 31;
const MAX_ELEVATION_POINTS = 300;

async function decodeActivityArchive(archiveBytes, decodeFit = decodeFitFile) {
  if (!(archiveBytes instanceof Uint8Array) || archiveBytes.length > MAX_ARCHIVE_SIZE) {
    throw new Error('Le fichier Garmin est vide ou trop volumineux.');
  }

  let files;
  try {
    files = unzipSync(archiveBytes, {
      filter: (file) =>
        /\.fit$/i.test(file.name) &&
        file.originalSize > 0 &&
        file.originalSize <= MAX_FIT_FILE_SIZE,
    });
  } catch {
    throw new Error('Impossible de décompresser le fichier de l’activité Garmin.');
  }

  const fitFile = Object.entries(files).find(([name]) => /\.fit$/i.test(name))?.[1];
  if (!fitFile) {
    throw new Error('Le téléchargement Garmin ne contient pas de fichier FIT exploitable.');
  }

  const messages = await decodeFit(fitFile);
  const records = messages?.recordMesgs;
  if (!Array.isArray(records)) {
    throw new Error('Le fichier FIT ne contient pas de points de parcours.');
  }

  const coordinates = records
    .map((record) =>
      toCoordinate(
        record?.positionLat,
        record?.positionLong,
        SEMICIRCLES_TO_DEGREES
      )
    )
    .filter(Boolean);

  if (coordinates.length < 2) {
    throw new Error('Aucun tracé GPS exploitable dans le fichier de l’activité.');
  }

  return {
    coordinates,
    elevationProfile: createElevationProfile(records),
  };
}

async function decodeFitFile(bytes) {
  const { Decoder, Stream } = await import('@garmin/fitsdk');
  const decoder = new Decoder(Stream.fromByteArray(bytes));

  if (!decoder.isFIT()) {
    throw new Error('Le fichier téléchargé n’est pas un fichier FIT valide.');
  }

  const { messages, errors } = decoder.read();
  if (errors.length > 0) {
    throw new Error('Impossible de décoder le fichier FIT Garmin.');
  }

  return messages;
}

function isValidCoordinate({ latitude, longitude }) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function toCoordinate(rawLatitude, rawLongitude, scale = 1) {
  if (rawLatitude == null || rawLongitude == null) {
    return null;
  }

  const coordinate = {
    latitude: Number(rawLatitude) * scale,
    longitude: Number(rawLongitude) * scale,
  };
  return isValidCoordinate(coordinate) ? coordinate : null;
}

function createElevationProfile(records) {
  const profile = records
    .map((record) => {
      const rawDistance = record?.distance;
      const rawAltitude = record?.enhancedAltitude ?? record?.altitude;
      if (rawDistance == null || rawAltitude == null) {
        return null;
      }

      const distance = Number(rawDistance);
      const altitude = Number(rawAltitude);
      if (
        !Number.isFinite(distance) ||
        distance < 0 ||
        !Number.isFinite(altitude)
      ) {
        return null;
      }

      return {
        distance,
        altitude,
        coordinate: toCoordinate(
          record?.positionLat,
          record?.positionLong,
          SEMICIRCLES_TO_DEGREES
        ),
      };
    })
    .filter(Boolean);

  if (profile.length < 2) {
    return [];
  }

  const startDistance = profile[0].distance;
  const normalizedProfile = profile.map((point) => ({
    ...point,
    distance: Math.max(0, point.distance - startDistance),
  }));

  return sampleProfile(normalizedProfile, MAX_ELEVATION_POINTS);
}

function sampleProfile(profile, maxPoints) {
  if (profile.length <= maxPoints) {
    return profile;
  }

  const sampled = [];
  const step = (profile.length - 1) / (maxPoints - 1);
  for (let index = 0; index < maxPoints; index += 1) {
    sampled.push(profile[Math.round(index * step)]);
  }
  return [...new Map(sampled.map((point) => [point.distance, point])).values()];
}

module.exports = { decodeActivityArchive };
