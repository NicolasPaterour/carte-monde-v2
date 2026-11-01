import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  Line as SvgLine,
  Polyline as SvgPolyline,
} from 'react-native-svg';
import styles from './styles';

// Affiche altitude, vitesse et frequence cardiaque sur la meme distance.
function ElevationProfilePanel({
  bottomInset,
  activity,
  profile,
  performanceProfile,
  isLoading,
  error,
  isOpen,
  onSelectCoordinate,
  onToggle,
}) {
  // Nettoie les points recus et calcule les plages d'affichage des axes.
  const validProfile = useMemo(
    () =>
      profile.filter(
        (point) =>
          Number.isFinite(point.distance) && Number.isFinite(point.altitude)
      ),
    [profile]
  );
  const validPerformanceProfile = useMemo(
    () =>
      performanceProfile.filter(
        (point) =>
          Number.isFinite(point.distance) &&
          (Number.isFinite(point.speed) || Number.isFinite(point.heartRate))
      ),
    [performanceProfile]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDistance, setSelectedDistance] = useState(0);
  useEffect(() => {
    setSelectedIndex(0);
    setSelectedDistance(0);
  }, [profile]);
  const minimumElevation = useMemo(
    () =>
      validProfile.length > 0
        ? Math.floor(
            validProfile.reduce(
              (minimum, point) => Math.min(minimum, point.altitude),
              Infinity
            )
          )
        : 0,
    [validProfile]
  );
  const maximumElevation = useMemo(
    () =>
      validProfile.length > 0
        ? Math.ceil(
            validProfile.reduce(
              (maximum, point) => Math.max(maximum, point.altitude),
              -Infinity
            )
          )
        : 0,
    [validProfile]
  );
  const elevationRange = Math.max(1, maximumElevation - minimumElevation);
  const [chartWidth, setChartWidth] = React.useState(0);
  const [performanceChartWidth, setPerformanceChartWidth] = React.useState(0);
  const chartHeight = 112;
  const chartPadding = 5;
  const performanceChartHeight = 88;
  const performanceChartPadding = 5;
  const totalDistance = Math.max(
    validProfile[validProfile.length - 1]?.distance ?? 0,
    validPerformanceProfile[validPerformanceProfile.length - 1]?.distance ?? 0,
    1
  );
  const distanceKm = totalDistance / 1000;
  const distanceTicks = [0, 0.25, 0.5, 0.75, 1];
  const speedPoints = validPerformanceProfile.filter((point) =>
    Number.isFinite(point.speed)
  );
  const heartRatePoints = validPerformanceProfile.filter((point) =>
    Number.isFinite(point.heartRate)
  );
  const maximumSpeed = Math.max(
    1,
    ...speedPoints.map((point) => point.speed * 3.6)
  );
  const minimumHeartRate = heartRatePoints.length
    ? Math.floor(
        heartRatePoints.reduce(
          (minimum, point) => Math.min(minimum, point.heartRate),
          Infinity
        )
      )
    : 0;
  const maximumHeartRate = heartRatePoints.length
    ? Math.ceil(
        heartRatePoints.reduce(
          (maximum, point) => Math.max(maximum, point.heartRate),
          -Infinity
        )
      )
    : 0;
  const heartRateRange = Math.max(1, maximumHeartRate - minimumHeartRate);
  const elevationTicks = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const progress = index / 4;
        return {
          altitude: Math.round(maximumElevation - progress * elevationRange),
          y:
            chartPadding +
            progress * (chartHeight - chartPadding * 2),
        };
      }),
    [chartHeight, chartPadding, elevationRange, maximumElevation]
  );
  const chartPoints = useMemo(
    () =>
      validProfile
        .map((point) => {
          const x =
            chartPadding +
            (point.distance / totalDistance) *
              Math.max(0, chartWidth - chartPadding * 2);
          const y =
            chartHeight -
            chartPadding -
            ((point.altitude - minimumElevation) / elevationRange) *
              (chartHeight - chartPadding * 2);
          return `${x},${y}`;
        })
        .join(' '),
    [
      chartHeight,
      chartPadding,
      chartWidth,
      elevationRange,
      minimumElevation,
      totalDistance,
      validProfile,
    ]
  );
  const performanceLinePoints = (points, valueForPoint, minimum, range) =>
    points
      .map((point) => {
        const x =
          performanceChartPadding +
          (point.distance / totalDistance) *
            Math.max(0, performanceChartWidth - performanceChartPadding * 2);
        const y =
          performanceChartHeight -
          performanceChartPadding -
          ((valueForPoint(point) - minimum) / range) *
            (performanceChartHeight - performanceChartPadding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  const speedLine = performanceLinePoints(
    speedPoints,
    (point) => point.speed * 3.6,
    0,
    maximumSpeed
  );
  const heartRateLine = performanceLinePoints(
    heartRatePoints,
    (point) => point.heartRate,
    minimumHeartRate,
    heartRateRange
  );
  const selectedPoint =
    selectedIndex == null ? null : validProfile[selectedIndex] ?? null;
  const selectedX =
    chartWidth > 0
      ? chartPadding +
        (selectedDistance / totalDistance) *
          Math.max(0, chartWidth - chartPadding * 2)
      : 0;
  const selectedY =
    selectedPoint
      ? chartHeight -
        chartPadding -
        ((selectedPoint.altitude - minimumElevation) / elevationRange) *
          (chartHeight - chartPadding * 2)
      : 0;
  const selectedPerformancePoint =
    validPerformanceProfile.length > 0
      ? validPerformanceProfile.reduce((closest, point) =>
          Math.abs(point.distance - selectedDistance) <
          Math.abs(closest.distance - selectedDistance)
            ? point
            : closest
        )
      : null;
  const selectedPerformanceX =
    performanceChartWidth > 0
      ? performanceChartPadding +
        (selectedDistance / totalDistance) *
          Math.max(0, performanceChartWidth - performanceChartPadding * 2)
      : 0;
  // Les deux graphiques partagent cette selection et deplacent le curseur de carte.
  const selectPointAtX = (x, width) => {
    if (width <= 0) {
      return;
    }

    const progress = Math.max(
      0,
      Math.min(
        1,
        (x - chartPadding) / Math.max(1, width - chartPadding * 2)
      )
    );
    const targetDistance = progress * totalDistance;
    setSelectedDistance(targetDistance);

    if (validProfile.length > 0) {
      let closestIndex = 0;
      for (let index = 1; index < validProfile.length; index += 1) {
        if (
          Math.abs(validProfile[index].distance - targetDistance) <
          Math.abs(validProfile[closestIndex].distance - targetDistance)
        ) {
          closestIndex = index;
        }
      }
      setSelectedIndex(closestIndex);
      onSelectCoordinate(validProfile[closestIndex]?.coordinate ?? null);
    } else {
      onSelectCoordinate(null);
    }
  };
  const adjustSelectedPoint = (direction) => {
    if (validProfile.length === 0) {
      setSelectedDistance((distance) =>
        Math.max(
          0,
          Math.min(totalDistance, distance + (direction * totalDistance) / 100)
        )
      );
      return;
    }

    const currentIndex = selectedIndex ?? 0;
    const nextIndex = Math.max(
      0,
      Math.min(validProfile.length - 1, currentIndex + direction)
    );
    setSelectedIndex(nextIndex);
    setSelectedDistance(validProfile[nextIndex].distance);
    onSelectCoordinate(validProfile[nextIndex]?.coordinate ?? null);
  };
  const handleAccessibilityAction = (event) => {
    if (event.nativeEvent.actionName === 'increment') {
      adjustSelectedPoint(1);
    } else if (event.nativeEvent.actionName === 'decrement') {
      adjustSelectedPoint(-1);
    }
  };

  return (
    <View style={[styles.elevationPanel, { bottom: Math.max(24, bottomInset + 12) }]}>
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
          ) : (
            <View>
              {validProfile.length < 2 ? (
                <Text style={styles.elevationMessageText}>
                  Aucune donnée d’altitude disponible pour cette sortie.
                </Text>
              ) : (
                <>
                  <View style={styles.elevationChartRow}>
                    <View style={styles.elevationAxis}>
                      {elevationTicks.map((tick, index) => (
                        <Text
                          key={`${tick.altitude}-${index}`}
                          style={[
                            styles.elevationAxisLabel,
                            { top: tick.y - 6 },
                          ]}
                        >
                          {tick.altitude} m
                        </Text>
                      ))}
                    </View>
                    <View
                      style={styles.elevationChart}
                      onLayout={(event) =>
                        setChartWidth(event.nativeEvent.layout.width)
                      }
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => true}
                      onResponderGrant={(event) =>
                        selectPointAtX(
                          event.nativeEvent.locationX,
                          chartWidth
                        )
                      }
                      onResponderMove={(event) =>
                        selectPointAtX(
                          event.nativeEvent.locationX,
                          chartWidth
                        )
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
                        <Svg width={chartWidth} height={chartHeight}>
                          {distanceTicks.map((progress) => {
                            const x =
                              chartPadding +
                              progress * (chartWidth - chartPadding * 2);
                            return (
                              <SvgLine
                                key={progress}
                                x1={x}
                                y1={chartPadding}
                                x2={x}
                                y2={chartHeight - chartPadding}
                                stroke="#f3f4f6"
                                strokeWidth={1}
                              />
                            );
                          })}
                          {elevationTicks.map((tick, index) => (
                            <SvgLine
                              key={`${tick.altitude}-${index}`}
                              x1={0}
                              y1={tick.y}
                              x2={chartWidth}
                              y2={tick.y}
                              stroke="#e5e7eb"
                              strokeWidth={1}
                            />
                          ))}
                          <ElevationLine points={chartPoints} />
                          {selectedDistance >= 0 && (
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
                              {selectedPoint && (
                                <SvgCircle
                                  cx={selectedX}
                                  cy={selectedY}
                                  r={5}
                                  fill="#dc2626"
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                              )}
                            </>
                          )}
                        </Svg>
                      )}
                    </View>
                    <View style={styles.performanceDistanceSpacer} />
                  </View>
                  {selectedPoint && (
                    <Text style={styles.selectedPointLabel}>
                      {(selectedPoint.distance / 1000).toFixed(2)} km ·{' '}
                      {Math.round(selectedPoint.altitude)} m
                    </Text>
                  )}
                  <View style={styles.distanceAxisRow}>
                    <View style={styles.elevationDistanceSpacer} />
                    <View style={styles.distanceTickTrack}>
                      {distanceTicks.map((progress) => (
                        <Text
                          key={progress}
                          style={styles.distanceTickLabel}
                        >
                          {(progress * distanceKm).toFixed(1)} km
                        </Text>
                      ))}
                    </View>
                    <View style={styles.performanceDistanceSpacer} />
                  </View>
                </>
              )}
              {validPerformanceProfile.length >= 2 ? (
                <View style={styles.performanceSection}>
                  <View style={styles.performanceLegend}>
                    <View style={styles.performanceLegendItem}>
                      <View
                        style={[
                          styles.performanceLegendLine,
                          { backgroundColor: '#f97316' },
                        ]}
                      />
                      <Text style={styles.performanceLegendText}>
                        Vitesse · km/h
                      </Text>
                    </View>
                    <View style={styles.performanceLegendItem}>
                      <View
                        style={[
                          styles.performanceLegendLine,
                          { backgroundColor: '#dc2626' },
                        ]}
                      />
                      <Text style={styles.performanceLegendText}>
                        Fréquence cardiaque · bpm
                      </Text>
                    </View>
                  </View>
                  <View style={styles.performanceChartRow}>
                    <View style={styles.performanceAxis}>
                      <Text style={styles.performanceAxisLabel}>
                        {maximumSpeed.toFixed(0)}
                      </Text>
                      <Text style={styles.performanceAxisLabel}>0</Text>
                    </View>
                    <View
                      style={styles.performanceChart}
                      onLayout={(event) =>
                        setPerformanceChartWidth(event.nativeEvent.layout.width)
                      }
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => true}
                      onResponderGrant={(event) =>
                        selectPointAtX(
                          event.nativeEvent.locationX,
                          performanceChartWidth
                        )
                      }
                      onResponderMove={(event) =>
                        selectPointAtX(
                          event.nativeEvent.locationX,
                          performanceChartWidth
                        )
                      }
                      accessibilityRole="adjustable"
                      accessibilityLabel="Curseur du profil de vitesse et de fréquence cardiaque"
                      accessibilityValue={{
                        min: 0,
                        max: Math.max(0, validPerformanceProfile.length - 1),
                        now: selectedIndex ?? 0,
                        text: `${(selectedDistance / 1000).toFixed(2)} kilomètres`,
                      }}
                      accessibilityActions={[
                        { name: 'increment', label: 'Avancer sur le parcours' },
                        { name: 'decrement', label: 'Reculer sur le parcours' },
                      ]}
                      onAccessibilityAction={handleAccessibilityAction}
                    >
                      {performanceChartWidth > 0 && (
                        <Svg
                          width={performanceChartWidth}
                          height={performanceChartHeight}
                        >
                          {[0, 0.5, 1].map((progress) => {
                            const y =
                              performanceChartPadding +
                              progress *
                                (performanceChartHeight -
                                  performanceChartPadding * 2);
                            return (
                              <SvgLine
                                key={progress}
                                x1={0}
                                y1={y}
                                x2={performanceChartWidth}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeWidth={1}
                              />
                            );
                          })}
                          {distanceTicks.map((progress) => {
                            const x =
                              performanceChartPadding +
                              progress *
                                (performanceChartWidth -
                                  performanceChartPadding * 2);
                            return (
                              <SvgLine
                                key={`distance-${progress}`}
                                x1={x}
                                y1={performanceChartPadding}
                                x2={x}
                                y2={
                                  performanceChartHeight -
                                  performanceChartPadding
                                }
                                stroke="#f3f4f6"
                                strokeWidth={1}
                              />
                            );
                          })}
                          {speedPoints.length >= 2 && (
                            <PerformanceLine
                              points={speedLine}
                              color="#f97316"
                            />
                          )}
                          {heartRatePoints.length >= 2 && (
                            <PerformanceLine
                              points={heartRateLine}
                              color="#dc2626"
                            />
                          )}
                          {selectedDistance >= 0 && (
                            <SvgLine
                              x1={selectedPerformanceX}
                              y1={performanceChartPadding}
                              x2={selectedPerformanceX}
                              y2={
                                performanceChartHeight -
                                performanceChartPadding
                              }
                              stroke="#6b7280"
                              strokeWidth={1}
                              strokeDasharray="3 3"
                            />
                          )}
                        </Svg>
                      )}
                    </View>
                    <View style={styles.performanceRightAxis}>
                      <Text style={styles.performanceAxisLabel}>
                        {maximumHeartRate}
                      </Text>
                      <Text style={styles.performanceAxisLabel}>
                        {minimumHeartRate}
                      </Text>
                    </View>
                  </View>
                  {selectedPerformancePoint && (
                    <Text style={styles.performanceSelectedLabel}>
                      {Number.isFinite(selectedPerformancePoint.speed)
                        ? `${(selectedPerformancePoint.speed * 3.6).toFixed(1)} km/h`
                        : '— km/h'}
                      {' · '}
                      {Number.isFinite(selectedPerformancePoint.heartRate)
                        ? `${Math.round(selectedPerformancePoint.heartRate)} bpm`
                        : '— bpm'}
                    </Text>
                  )}
                  <View style={styles.distanceAxisRow}>
                    <View style={styles.elevationDistanceSpacer} />
                    <View style={styles.distanceTickTrack}>
                      {distanceTicks.map((progress) => (
                        <Text
                          key={progress}
                          style={styles.distanceTickLabel}
                        >
                          {(progress * distanceKm).toFixed(1)} km
                        </Text>
                      ))}
                    </View>
                    <View style={styles.performanceDistanceSpacer} />
                  </View>
                </View>
              ) : (
                <Text style={styles.elevationMessageText}>
                  Données de vitesse ou de fréquence cardiaque insuffisantes
                  pour tracer le graphe.
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const ElevationLine = memo(function ElevationLine({ points }) {
  return (
    <SvgPolyline
      points={points}
      fill="none"
      stroke="#2563eb"
      strokeWidth={3}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
});

const PerformanceLine = memo(function PerformanceLine({ points, color }) {
  return (
    <SvgPolyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
});

export default ElevationProfilePanel;
