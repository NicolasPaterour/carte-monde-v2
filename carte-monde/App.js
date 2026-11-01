import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import ActivitiesPanel from './features/activities/ActivitiesPanel';
import useActivityTrack from './features/activities/useActivityTrack';
import ActivityProfilePanel from './features/activity-profile/ActivityProfilePanel';
import ActivityMap from './features/map/ActivityMap';
import PlaceSearchPanel from './features/places/PlaceSearchPanel';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// Assemble les features et orchestre leurs interactions sur la carte.
function AppContent() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [place, setPlace] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(true);
  const {
    selectedActivity,
    activityTrack,
    elevationProfile,
    performanceProfile,
    isLoadingTrack,
    trackMessage,
    selectActivity,
  } = useActivityTrack(mapRef);

  const handlePlaceSelected = (selectedPlace) => {
    setPlace(selectedPlace);
    mapRef.current?.animateToRegion(
      {
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      },
      800
    );
  };

  const handleActivitySelected = (activity) => {
    setIsProfileOpen(true);
    selectActivity(activity);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ActivityMap
        ref={mapRef}
        place={place}
        activityTrack={activityTrack}
      />
      {selectedActivity && (
        <ActivityProfilePanel
          key={selectedActivity.id}
          bottomInset={insets.bottom}
          activity={selectedActivity}
          profile={elevationProfile}
          performanceProfile={performanceProfile}
          isLoading={isLoadingTrack}
          error={trackMessage}
          isOpen={isProfileOpen}
          onSelectCoordinate={(coordinate) =>
            mapRef.current?.setCursorCoordinate(coordinate)
          }
          onToggle={() => setIsProfileOpen((isOpen) => !isOpen)}
        />
      )}
      <View style={styles.topControls}>
        <PlaceSearchPanel onPlaceSelected={handlePlaceSelected} />
        <ActivitiesPanel
          selectedActivity={selectedActivity}
          onSelectActivity={handleActivitySelected}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 1,
  },
});
