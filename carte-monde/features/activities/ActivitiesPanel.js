import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { cacheActivities, getCachedActivities } from '../../services/ActivityCache';
import GarminService from '../../services/GarminService';
import styles from './styles';

const garminService = new GarminService();

// Gère le cache, le chargement, le filtrage par date et la sélection d’activités.
export default function ActivitiesPanel({
  selectedActivity,
  onSelectActivity,
}) {
  const [activities, setActivities] = useState([]);
  const [activityDateQuery, setActivityDateQuery] = useState('');
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingActivityCache, setIsLoadingActivityCache] = useState(true);
  const [activitiesMessage, setActivitiesMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const restoreCachedActivities = async () => {
      try {
        const cachedActivities = await getCachedActivities();
        if (isMounted && cachedActivities !== null) {
          setActivities(cachedActivities);
          setActivitiesLoaded(true);
        }
      } catch (error) {
        if (isMounted) {
          setActivitiesMessage(
            error instanceof Error
              ? `Impossible de lire le cache des activités Garmin : ${error.message}`
              : 'Impossible de lire le cache des activités Garmin.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingActivityCache(false);
        }
      }
    };

    restoreCachedActivities();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadActivities = async () => {
    if (isLoadingActivities || isLoadingActivityCache) {
      return;
    }

    setIsLoadingActivities(true);
    setActivitiesMessage('');

    try {
      const loadedActivities = await garminService.getCyclingActivities();
      const sortedActivities = [...loadedActivities].sort(
        (left, right) => Date.parse(right.startTime) - Date.parse(left.startTime)
      );
      setActivities(sortedActivities);
      setActivitiesLoaded(true);
      setActivitiesOpen(true);
      try {
        await cacheActivities(sortedActivities);
      } catch (error) {
        setActivitiesMessage(
          error instanceof Error
            ? `Activités chargées, mais impossible de les mettre en cache : ${error.message}`
            : 'Activités chargées, mais impossible de les mettre en cache.'
        );
      }
    } catch (error) {
      setActivitiesMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les activités Garmin.'
      );
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const toggleActivities = () => {
    if (activitiesLoaded) {
      setActivitiesOpen((isOpen) => !isOpen);
      return;
    }
    loadActivities();
  };

  const selectActivity = (activity) => {
    setActivitiesOpen(false);
    onSelectActivity(activity);
  };

  const filteredActivities = activities.filter((activity) =>
    matchesActivityDate(activity, activityDateQuery)
  );
  const isBusy = isLoadingActivities || isLoadingActivityCache;

  return (
    <View style={styles.activitiesContainer}>
      <View style={styles.activitiesHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activitiesLoaded
              ? 'Afficher les activités cyclistes'
              : 'Charger les activités Garmin'
          }
          style={styles.activitiesToggle}
          onPress={toggleActivities}
          disabled={isBusy}
        >
          {isBusy ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.activitiesToggleText}>
              {selectedActivity
                ? `${formatActivityDate(selectedActivity.startTime)} · ${selectedActivity.name}`
                : activitiesLoaded
                  ? `Activités vélo (${activities.length})`
                  : 'Charger mes activités Garmin'}
            </Text>
          )}
          {!isBusy && (
            <Text style={styles.activitiesChevron}>
              {activitiesOpen ? '⌃' : '⌄'}
            </Text>
          )}
        </Pressable>
        {activitiesLoaded && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recharger les activités Garmin"
            style={styles.refreshButton}
            onPress={loadActivities}
            disabled={isBusy}
          >
            <Text style={styles.refreshButtonText}>↻</Text>
          </Pressable>
        )}
      </View>
      {!!activitiesMessage && (
        <Text style={styles.activitiesMessage}>{activitiesMessage}</Text>
      )}
      {activitiesOpen && activitiesLoaded && (
        <>
          <TextInput
            accessibilityLabel="Rechercher une activité par date"
            style={styles.activityDateSearch}
            placeholder="Rechercher par date (JJ/MM/AAAA)"
            value={activityDateQuery}
            onChangeText={setActivityDateQuery}
            clearButtonMode="while-editing"
            keyboardType="numbers-and-punctuation"
            returnKeyType="search"
          />
          <ScrollView
            style={styles.activitiesList}
            keyboardShouldPersistTaps="handled"
          >
            {filteredActivities.length === 0 ? (
              <Text style={styles.emptyActivities}>
                {activities.length === 0
                  ? 'Aucune activité cycliste trouvée.'
                  : 'Aucune activité trouvée pour cette date.'}
              </Text>
            ) : (
              filteredActivities.map((activity) => (
                <Pressable
                  key={activity.id}
                  accessibilityRole="button"
                  style={styles.activityItem}
                  onPress={() => selectActivity(activity)}
                >
                  <Text style={styles.activityDate}>
                    {formatActivityDate(activity.startTime)}
                  </Text>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {activity.name}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function formatActivityDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function matchesActivityDate(activity, query) {
  const normalizedQuery = normalizeDateSearch(query);
  if (!normalizedQuery) {
    return true;
  }

  const date = new Date(activity.startTime);
  if (!Number.isFinite(date.getTime())) {
    return false;
  }

  const localDateDigits = [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getFullYear()),
  ].join('');
  const isoDateDigits = [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const searchableDates = [
    localDateDigits,
    isoDateDigits,
    date.toLocaleDateString('fr-FR', { dateStyle: 'medium' }),
    formatActivityDate(activity.startTime),
  ].map(normalizeDateSearch);

  return searchableDates.some((searchableDate) =>
    searchableDate.includes(normalizedQuery)
  );
}

function normalizeDateSearch(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]/g, '');
}
