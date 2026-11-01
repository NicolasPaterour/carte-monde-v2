const assert = require('node:assert/strict');
const test = require('node:test');
const { unzipSync, zipSync } = require('fflate');
const { decodeActivityArchive } = require('./activityTrack');
const { GarminPersonalApi } = require('./GarminPersonalApi');

test('loads cycling activities from all pages and sorts newest first', async () => {
  const futureExpiration = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 })
  ).toString('base64url');
  const accessToken = `header.${futureExpiration}.signature`;
  const cyclingPage = Array.from({ length: 100 }, (_, index) => ({
    activityId: index + 1,
    activityName: `Sortie ${index + 1}`,
    startTimeLocal: new Date(Date.UTC(2025, 0, index + 1)).toISOString(),
    activityType: { typeKey: 'road_biking' },
  }));
  const calls = [];

  const api = new GarminPersonalApi('test-key', {
    fetchImpl: async (url, options = {}) => {
      const parsedUrl = new URL(url);
      calls.push({ url: parsedUrl, options });

      if (options.method === 'POST') {
        return { ok: true, status: 200, text: async () => accessToken };
      }
      if (parsedUrl.searchParams.get('start') === '0') {
        return { ok: true, status: 200, json: async () => cyclingPage };
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            activityId: 101,
            activityName: 'Course',
            startTimeLocal: '2025-06-01T10:00:00Z',
            activityType: { typeKey: 'running' },
          },
          {
            activityId: 102,
            activityName: 'Balade',
            startTimeLocal: '2025-06-02T10:00:00Z',
            activityType: { typeKey: 'cycling' },
          },
        ],
      };
    },
  });

  const activities = await api.getCyclingActivities();

  assert.equal(activities.length, 101);
  assert.equal(activities[0].id, '102');
  assert.equal(activities[0].name, 'Balade');
  assert.equal(activities.at(-1).id, '1');
  assert.equal(calls.filter(({ options }) => options.method === 'POST').length, 1);
  assert.deepEqual(
    calls
      .filter(({ options }) => options.method !== 'POST')
      .map(({ url }) => url.searchParams.get('start')),
    ['0', '100']
  );
  assert.equal(
    calls.find(({ options }) => options.method === 'POST').options.headers.Authorization,
    'ApiKey test-key'
  );
});

test('rejects a missing personal API key', () => {
  assert.throws(() => new GarminPersonalApi(''), /GARMIN_PERSONAL_API_KEY/);
});

test('downloads and decodes an activity FIT file with GPS and elevation', async () => {
  const archive = zipSync({ 'activity.fit': Uint8Array.from([1, 2, 3]) });
  const decodedTrack = {
    coordinates: [
      { latitude: 48.85, longitude: 2.35 },
      { latitude: 48.86, longitude: 2.36 },
    ],
    elevationProfile: [
      { distance: 0, altitude: 120 },
      { distance: 1000, altitude: 130 },
    ],
    performanceProfile: [],
  };
  const api = new GarminPersonalApi('test-key', {
    fetchImpl: async (url, options) => {
      assert.match(String(url), /\/download-service\/files\/activity\/123$/);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return {
        ok: true,
        status: 200,
        headers: { get: () => String(archive.length) },
        arrayBuffer: async () =>
          archive.buffer.slice(
            archive.byteOffset,
            archive.byteOffset + archive.byteLength
          ),
      };
    },
    decodeFitArchive: async (bytes) => {
      assert.deepEqual(Array.from(unzipSync(bytes)['activity.fit']), [1, 2, 3]);
      return decodedTrack;
    },
  });
  api.accessToken = 'test-token';
  api.tokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000;

  assert.deepEqual(await api.getActivityTrack('123'), decodedTrack);
});

test('rejects invalid activity IDs before making a request', async () => {
  const api = new GarminPersonalApi('test-key', {
    fetchImpl: async () => {
      throw new Error('The Garmin API must not be called.');
    },
  });

  await assert.rejects(api.getActivityTrack('../123'), /Identifiant d’activité invalide/);
});

test('downloads FIT directly and extracts GPS and elevation', async () => {
  const archive = zipSync({ 'activity.fit': Uint8Array.from([1, 2, 3]) });
  const requests = [];
  const api = new GarminPersonalApi('test-key', {
    fetchImpl: async (url) => {
      requests.push(String(url));
      assert.match(String(url), /\/download-service\/files\/activity\/456$/);
      return {
        ok: true,
        status: 200,
        headers: { get: () => String(archive.length) },
        arrayBuffer: async () =>
          archive.buffer.slice(
            archive.byteOffset,
            archive.byteOffset + archive.byteLength
          ),
      };
    },
    decodeFitArchive: async (bytes) => {
      assert.equal(bytes[0], 0x50);
      assert.deepEqual(Array.from(unzipSync(bytes)['activity.fit']), [1, 2, 3]);
      return {
        coordinates: [
          { latitude: 48.85, longitude: 2.35 },
          { latitude: 48.86, longitude: 2.36 },
        ],
        elevationProfile: [
          { distance: 0, altitude: 120 },
          { distance: 1000, altitude: 130 },
        ],
      };
    },
  });
  api.accessToken = 'test-token';
  api.tokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000;

  assert.deepEqual(await api.getActivityTrack('456'), {
    coordinates: [
      { latitude: 48.85, longitude: 2.35 },
      { latitude: 48.86, longitude: 2.36 },
    ],
    elevationProfile: [
      { distance: 0, altitude: 120 },
      { distance: 1000, altitude: 130 },
    ],
  });
  assert.equal(requests.length, 1);
});

test('decodes FIT distance and altitude values into a sampled profile', async () => {
  const archive = zipSync({ 'activity.fit': Uint8Array.from([1, 2, 3]) });
  const records = Array.from({ length: 600 }, (_, index) => ({
    positionLat: (48.85 * 2 ** 31) / 180,
    positionLong: (2.35 * 2 ** 31) / 180,
    distance: 1500 + index * 10,
    altitude: 100 + index / 10,
    enhancedAltitude: 110 + index / 10,
    enhancedSpeed: 5 + index / 10,
    heartRate: 120 + index / 10,
  }));
  records[12].altitude = null;
  records[12].enhancedAltitude = null;
  records[12].heartRate = 0;

  const result = await decodeActivityArchive(archive, async (bytes) => {
    assert.deepEqual(Array.from(bytes), [1, 2, 3]);
    return { recordMesgs: records };
  });

  assert.equal(result.coordinates.length, 600);
  assert.equal(result.elevationProfile.length, 300);
  assert.deepEqual(result.elevationProfile[0], {
    distance: 0,
    altitude: 110,
    coordinate: { latitude: 48.85, longitude: 2.35 },
  });
  assert.deepEqual(result.elevationProfile.at(-1), {
    distance: 5990,
    altitude: 169.9,
    coordinate: { latitude: 48.85, longitude: 2.35 },
  });
  assert.equal(result.elevationProfile.some((point) => point.distance === 120), false);
  assert.equal(result.performanceProfile.length, 300);
  assert.deepEqual(result.performanceProfile[0], {
    distance: 0,
    speed: 5,
    heartRate: 120,
  });
  assert.deepEqual(result.performanceProfile.at(-1), {
    distance: 5990,
    speed: 64.9,
    heartRate: 179.9,
  });
  assert.deepEqual(
    result.performanceProfile.find((point) => point.distance === 120),
    { distance: 120, speed: 6.2, heartRate: null }
  );
});
