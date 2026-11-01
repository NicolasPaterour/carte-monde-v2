import { useRef, useState } from 'react';
import GarminService from '../../services/GarminService';

const garminService = new GarminService();

// Charge le tracé d’une activité et ignore les réponses arrivées hors ordre.
export default function useActivityTrack(mapRef) {
  const requestId = useRef(0);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityTrack, setActivityTrack] = useState([]);
  const [elevationProfile, setElevationProfile] = useState([]);
  const [performanceProfile, setPerformanceProfile] = useState([]);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [trackMessage, setTrackMessage] = useState('');

  const selectActivity = async (activity) => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    setSelectedActivity(activity);
    setActivityTrack([]);
    setElevationProfile([]);
    setPerformanceProfile([]);
    mapRef.current?.setCursorCoordinate(null);
    setTrackMessage('');
    setIsLoadingTrack(true);

    try {
      const track = await garminService.getActivityTrack(activity.id);
      if (currentRequestId !== requestId.current) {
        return;
      }

      setActivityTrack(track.coordinates);
      setElevationProfile(track.elevationProfile);
      setPerformanceProfile(track.performanceProfile);
      mapRef.current?.setCursorCoordinate(
        track.elevationProfile[0]?.coordinate ?? null
      );
      mapRef.current?.fitToCoordinates(track.coordinates, {
        edgePadding: { top: 220, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setTrackMessage(
          error instanceof Error
            ? error.message
            : 'Impossible de charger le tracé GPS de cette activité.'
        );
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setIsLoadingTrack(false);
      }
    }
  };

  return {
    selectedActivity,
    activityTrack,
    elevationProfile,
    performanceProfile,
    isLoadingTrack,
    trackMessage,
    selectActivity,
  };
}
