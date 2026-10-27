import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVITIES_CACHE_KEY = 'carte-monde:garmin-activities';

export async function getCachedActivities() {
  const cachedValue = await AsyncStorage.getItem(ACTIVITIES_CACHE_KEY);
  if (cachedValue == null) {
    return null;
  }

  const activities = JSON.parse(cachedValue);
  if (
    !Array.isArray(activities) ||
    !activities.every(
      (activity) =>
        activity &&
        (typeof activity.id === 'string' || typeof activity.id === 'number') &&
        typeof activity.name === 'string' &&
        typeof activity.startTime === 'string' &&
        Number.isFinite(Date.parse(activity.startTime))
    )
  ) {
    throw new Error('Le cache des activités Garmin est invalide.');
  }

  return activities;
}

export async function cacheActivities(activities) {
  await AsyncStorage.setItem(ACTIVITIES_CACHE_KEY, JSON.stringify(activities));
}
