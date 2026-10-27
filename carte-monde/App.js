import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, {
  Circle as SvgCircle,
  Line as SvgLine,
  Polyline as SvgPolyline,
} from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { cacheActivities, getCachedActivities } from './services/ActivityCache';
import GarminService from './services/GarminService';

// Vue initiale : le monde entier
const INITIAL_REGION = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 120,
};

const garminService = new GarminService();

export default function App() {
  const mapRef = useRef(null);
  const trackRequestId = useRef(0);
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [activities, setActivities] = useState([]);
  const [activityDateQuery, setActivityDateQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityTrack, setActivityTrack] = useState([]);
  const [elevationProfile, setElevationProfile] = useState([]);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(null);
  const [isElevationProfileOpen, setIsElevationProfileOpen] = useState(true);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoadingActivityCache, setIsLoadingActivityCache] = useState(true);
  const [activitiesMessage, setActivitiesMessage] = useState('');
  const [trackMessage, setTrackMessage] = useState('');

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

  const searchPlace = async () => {
    const searchQuery = query.trim();
    if (!searchQuery || isSearching) {
      return;
    }

    setIsSearching(true);
    setSearchMessage('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CarteMonde/1.0',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`La recherche a échoué (${response.status}).`);
      }

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        setSearchMessage('Aucun lieu trouvé. Essayez un autre nom.');
        return;
      }

      const result = results[0];
      const latitude = Number(result?.lat);
      const longitude = Number(result?.lon);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        setSearchMessage('Coordonnées invalides pour ce lieu.');
        return;
      }

      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
      setPlace({
        latitude,
        longitude,
        title: searchQuery,
        description: result.display_name,
      });
      mapRef.current?.animateToRegion(region, 800);
    } catch (error) {
      setSearchMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de rechercher ce lieu. Vérifiez votre connexion.'
      );
    } finally {
      setIsSearching(false);
    }
  };

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

  const selectActivity = async (activity) => {
    const requestId = trackRequestId.current + 1;
    trackRequestId.current = requestId;
    setSelectedActivity(activity);
    setActivitiesOpen(false);
    setActivityTrack([]);
    setElevationProfile([]);
    setSelectedProfileIndex(null);
    setIsElevationProfileOpen(true);
    setTrackMessage('');
    setIsLoadingTrack(true);

    try {
      const track = await garminService.getActivityTrack(activity.id);
      if (requestId !== trackRequestId.current) {
        return;
      }
      setActivityTrack(track.coordinates);
      setElevationProfile(track.elevationProfile);
      setSelectedProfileIndex(track.elevationProfile.length > 0 ? 0 : null);
      mapRef.current?.fitToCoordinates(track.coordinates, {
        edgePadding: { top: 220, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    } catch (error) {
      if (requestId === trackRequestId.current) {
        setTrackMessage(
          error instanceof Error
            ? error.message
            : 'Impossible de charger le tracé GPS de cette activité.'
        );
      }
    } finally {
      if (requestId === trackRequestId.current) {
        setIsLoadingTrack(false);
      }
    }
  };

  const filteredActivities = activities.filter((activity) =>
    matchesActivityDate(activity, activityDateQuery)
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsCompass
        showsScale
        mapType="standard" // essaie aussi "satellite" ou "hybrid"
      >
        {place && (
          <Marker
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.title}
            description={place.description}
          />
        )}
        {activityTrack.length > 1 && (
          <Polyline
            coordinates={activityTrack}
            strokeColor="#2563eb"
            strokeWidth={4}
          />
        )}
        {selectedProfileIndex != null &&
          elevationProfile[selectedProfileIndex]?.coordinate && (
            <Marker
              coordinate={elevationProfile[selectedProfileIndex].coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.trackCursorMarker} />
            </Marker>
          )}
      </MapView>
      {selectedActivity && (
        <ElevationProfilePanel
          activity={selectedActivity}
          profile={elevationProfile}
          isLoading={isLoadingTrack}
          error={trackMessage}
          isOpen={isElevationProfileOpen}
          selectedIndex={selectedProfileIndex}
          onSelectPoint={setSelectedProfileIndex}
          onToggle={() => setIsElevationProfileOpen((isOpen) => !isOpen)}
        />
      )}
      <View style={styles.topControls}>
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel="Rechercher un lieu"
              style={styles.searchInput}
              placeholder="Rechercher une ville, un lieu..."
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={searchPlace}
              returnKeyType="search"
              clearButtonMode="while-editing"
              editable={!isSearching}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rechercher"
              style={[styles.searchButton, isSearching && styles.disabledButton]}
              onPress={searchPlace}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>Rechercher</Text>
              )}
            </Pressable>
          </View>
          {!!searchMessage && <Text style={styles.searchMessage}>{searchMessage}</Text>}
        </View>

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
              disabled={isLoadingActivities || isLoadingActivityCache}
            >
              {isLoadingActivities || isLoadingActivityCache ? (
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
              {!isLoadingActivities && !isLoadingActivityCache && (
                <Text style={styles.activitiesChevron}>{activitiesOpen ? '⌃' : '⌄'}</Text>
              )}
            </Pressable>
            {activitiesLoaded && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Recharger les activités Garmin"
                style={styles.refreshButton}
                onPress={loadActivities}
                disabled={isLoadingActivities || isLoadingActivityCache}
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
              <ScrollView style={styles.activitiesList} keyboardShouldPersistTaps="handled">
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
      </View>
    </View>
  );
}

function ElevationProfilePanel({
  activity,
  profile,
  isLoading,
  error,
  isOpen,
  selectedIndex,
  onSelectPoint,
  onToggle,
}) {
  const validProfile = profile.filter(
    (point) => Number.isFinite(point.distance) && Number.isFinite(point.altitude)
  );
  const minimumElevation =
    validProfile.length > 0
      ? Math.floor(Math.min(...validProfile.map((point) => point.altitude)))
      : 0;
  const maximumElevation =
    validProfile.length > 0
      ? Math.ceil(Math.max(...validProfile.map((point) => point.altitude)))
      : 0;
  const distanceKm =
    validProfile.length > 0
      ? validProfile[validProfile.length - 1].distance / 1000
      : 0;
  const elevationRange = Math.max(1, maximumElevation - minimumElevation);
  const [chartWidth, setChartWidth] = React.useState(0);
  const chartHeight = 112;
  const chartPadding = 5;
  const chartPoints = validProfile
    .map((point) => {
      const x =
        chartPadding +
        (point.distance / Math.max(1, validProfile[validProfile.length - 1].distance)) *
          Math.max(0, chartWidth - chartPadding * 2);
      const y =
        chartHeight -
        chartPadding -
        ((point.altitude - minimumElevation) / elevationRange) *
          (chartHeight - chartPadding * 2);
      return `${x},${y}`;
    })
    .join(' ');
  const selectedPoint =
    selectedIndex == null ? null : validProfile[selectedIndex] ?? null;
  const selectedX =
    selectedPoint && chartWidth > 0
      ? chartPadding +
        (selectedPoint.distance / Math.max(1, validProfile[validProfile.length - 1].distance)) *
          Math.max(0, chartWidth - chartPadding * 2)
      : 0;
  const selectedY =
    selectedPoint
      ? chartHeight -
        chartPadding -
        ((selectedPoint.altitude - minimumElevation) / elevationRange) *
          (chartHeight - chartPadding * 2)
      : 0;
  const selectPointAtX = (x) => {
    if (chartWidth <= 0 || validProfile.length === 0) {
      return;
    }

    const progress = Math.max(
      0,
      Math.min(1, (x - chartPadding) / Math.max(1, chartWidth - chartPadding * 2))
    );
    const targetDistance =
      progress * validProfile[validProfile.length - 1].distance;
    let closestIndex = 0;
    for (let index = 1; index < validProfile.length; index += 1) {
      if (
        Math.abs(validProfile[index].distance - targetDistance) <
        Math.abs(validProfile[closestIndex].distance - targetDistance)
      ) {
        closestIndex = index;
      }
    }
    onSelectPoint(closestIndex);
  };
  const adjustSelectedPoint = (direction) => {
    const currentIndex = selectedIndex ?? 0;
    onSelectPoint(
      Math.max(0, Math.min(validProfile.length - 1, currentIndex + direction))
    );
  };
  const handleAccessibilityAction = (event) => {
    if (event.nativeEvent.actionName === 'increment') {
      adjustSelectedPoint(1);
    } else if (event.nativeEvent.actionName === 'decrement') {
      adjustSelectedPoint(-1);
    }
  };

  return (
    <View style={styles.elevationPanel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isOpen ? 'Replier le profil altimétrique' : 'Afficher le profil altimétrique'
        }
        accessibilityState={{ expanded: isOpen }}
        style={styles.elevationHeader}
        onPress={onToggle}
      >
        <View style={styles.elevationHeaderText}>
          <Text style={styles.elevationTitle}>Profil altimétrique</Text>
          <Text style={styles.elevationSubtitle} numberOfLines={1}>
            {activity.name}
            {distanceKm > 0 ? ` · ${distanceKm.toFixed(1)} km` : ''}
          </Text>
        </View>
        <Text style={styles.elevationChevron}>{isOpen ? '⌄' : '⌃'}</Text>
      </Pressable>
      {isOpen && (
        <View style={styles.elevationContent}>
          {isLoading ? (
            <View style={styles.elevationMessage}>
              <ActivityIndicator color="#2563eb" />
              <Text style={styles.elevationMessageText}>Chargement du profil…</Text>
            </View>
          ) : error ? (
            <Text style={styles.elevationError}>{error}</Text>
          ) : validProfile.length < 2 ? (
            <Text style={styles.elevationMessageText}>
              Aucune donnée d’altitude disponible pour cette sortie.
            </Text>
          ) : (
            <>
              <View style={styles.elevationChartRow}>
                <View style={styles.elevationAxis}>
                  <Text style={styles.elevationAxisLabel}>{maximumElevation} m</Text>
                  <Text style={styles.elevationAxisLabel}>{minimumElevation} m</Text>
                </View>
                <View
                  style={styles.elevationChart}
                  onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(event) =>
                    selectPointAtX(event.nativeEvent.locationX)
                  }
                  onResponderMove={(event) =>
                    selectPointAtX(event.nativeEvent.locationX)
                  }
                  accessibilityRole="adjustable"
                  accessibilityLabel="Curseur du profil altimétrique"
                  accessibilityValue={{
                    min: 0,
                    max: Math.max(0, validProfile.length - 1),
                    now: selectedIndex ?? 0,
                    text: selectedPoint
                      ? `${selectedPoint.distance / 1000} kilomètres, ${selectedPoint.altitude} mètres`
                      : undefined,
                  }}
                  accessibilityActions={[
                    { name: 'increment', label: 'Avancer sur le parcours' },
                    { name: 'decrement', label: 'Reculer sur le parcours' },
                  ]}
                  onAccessibilityAction={handleAccessibilityAction}
                >
                  {chartWidth > 0 && (
                    <>
                      <View style={styles.elevationGridLineTop} />
                      <View style={styles.elevationGridLineBottom} />
                      <Svg width={chartWidth} height={chartHeight}>
                        <SvgPolyline
                          points={chartPoints}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth={3}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {selectedPoint && (
                          <>
                            <SvgLine
                              x1={selectedX}
                              y1={chartPadding}
                              x2={selectedX}
                              y2={chartHeight - chartPadding}
                              stroke="#dc2626"
                              strokeWidth={1}
                              strokeDasharray="3 3"
                            />
                            <SvgCircle
                              cx={selectedX}
                              cy={selectedY}
                              r={5}
                              fill="#dc2626"
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          </>
                        )}
                      </Svg>
                    </>
                  )}
                </View>
              </View>
              {selectedPoint && (
                <Text style={styles.selectedPointLabel}>
                  {(selectedPoint.distance / 1000).toFixed(2)} km ·{' '}
                  {Math.round(selectedPoint.altitude)} m
                </Text>
              )}
              <View style={styles.distanceLabels}>
                <Text style={styles.elevationAxisLabel}>0 km</Text>
                <Text style={styles.elevationAxisLabel}>{distanceKm.toFixed(1)} km</Text>
              </View>
            </>
          )}
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  trackCursorMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#dc2626',
    elevation: 4,
  },
  elevationPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    zIndex: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  elevationHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  elevationHeaderText: {
    flex: 1,
  },
  elevationTitle: {
    color: '#222',
    fontSize: 15,
    fontWeight: '700',
  },
  elevationSubtitle: {
    marginTop: 2,
    color: '#666',
    fontSize: 12,
  },
  elevationChevron: {
    marginLeft: 12,
    color: '#2563eb',
    fontSize: 22,
  },
  elevationContent: {
    paddingTop: 8,
  },
  elevationChartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  elevationAxis: {
    width: 46,
    height: 112,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  elevationAxisLabel: {
    color: '#666',
    fontSize: 10,
  },
  elevationChart: {
    flex: 1,
    height: 112,
    overflow: 'hidden',
  },
  elevationGridLineTop: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  elevationGridLineBottom: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  distanceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 46,
    marginTop: 4,
  },
  selectedPointLabel: {
    marginTop: 2,
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  elevationMessage: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevationMessageText: {
    color: '#666',
    fontSize: 13,
  },
  elevationError: {
    color: '#b42318',
    fontSize: 13,
  },
  topControls: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 1,
  },
  searchContainer: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 12,
    color: '#222',
  },
  searchButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  disabledButton: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchMessage: {
    marginTop: 8,
    color: '#b42318',
    fontSize: 13,
  },
  activitiesContainer: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  activitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activitiesToggle: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activitiesToggleText: {
    flex: 1,
    color: '#222',
    fontWeight: '600',
  },
  activitiesChevron: {
    marginLeft: 10,
    color: '#2563eb',
    fontSize: 20,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  refreshButtonText: {
    color: '#2563eb',
    fontSize: 22,
  },
  activitiesList: {
    maxHeight: 240,
    marginTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  activityDateSearch: {
    minHeight: 40,
    marginTop: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    color: '#222',
    fontSize: 14,
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  activityDate: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  activityName: {
    marginTop: 3,
    color: '#222',
  },
  emptyActivities: {
    paddingVertical: 12,
    color: '#555',
  },
  activitiesMessage: {
    marginTop: 6,
    color: '#b42318',
    fontSize: 13,
  },
});
