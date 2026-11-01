import React, {
  forwardRef,
  memo,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import styles from './styles';

// Affiche les lieux et le tracé ; expose au parent les actions natives de la carte.
const INITIAL_REGION = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 120,
};

const ActivityMap = forwardRef(function ActivityMap(
  { place, activityTrack },
  ref
) {
  const nativeMapRef = useRef(null);
  const [cursorCoordinate, setCursorCoordinate] = useState(null);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (...args) => nativeMapRef.current?.animateToRegion(...args),
      fitToCoordinates: (...args) =>
        nativeMapRef.current?.fitToCoordinates(...args),
      setCursorCoordinate,
    }),
    []
  );

  return (
    <MapView
      ref={nativeMapRef}
      style={styles.map}
      initialRegion={INITIAL_REGION}
      showsUserLocation
      showsCompass
      showsScale
      mapType="standard"
    >
      {place && (
        <Marker
          coordinate={{ latitude: place.latitude, longitude: place.longitude }}
          title={place.title}
          description={place.description}
        />
      )}
      {activityTrack.length > 1 && <ActivityPolyline coordinates={activityTrack} />}
      {cursorCoordinate && <TrackCursorMarker coordinate={cursorCoordinate} />}
    </MapView>
  );
});

const ActivityPolyline = memo(function ActivityPolyline({ coordinates }) {
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor="#2563eb"
      strokeWidth={4}
    />
  );
});

const TrackCursorMarker = memo(function TrackCursorMarker({ coordinate }) {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      <View style={styles.trackCursorMarker} />
    </Marker>
  );
});

export default ActivityMap;
