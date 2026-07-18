import { decodePolyline, getDistance, getBearing } from './utils';
import type { RouteSamplingData } from './types';

export interface SimulationIntervalPoint {
  targetMs: number;
  posIdx: number;
  lat: number;
  lng: number;
  bearing: number | null;
  wpId: number;
}

interface RouteCache {
  routePositions: [number, number][];
  weatherPtCoords: { ptId: number, lat: number, lng: number }[];
  totalEffectiveDist: number;
  durations: Map<number, SimulationIntervalPoint[]>;
}

const routeCache = new WeakMap<RouteSamplingData, RouteCache>();

export function simulateRideIntervals(
  routePolyline: string,
  physics: RouteSamplingData,
  weatherPoints: Record<number, string>,
  durationMs: number
): SimulationIntervalPoint[] {
  if (!routePolyline || !physics || !physics.distances || !physics.speedMultipliers || !weatherPoints) {
    return [];
  }

  let rc = routeCache.get(physics);

  if (!rc) {
    const routePositions = decodePolyline(routePolyline);
    const pts = Object.keys(weatherPoints).map(Number).sort((a, b) => a - b);
    const weatherPtCoords = pts.map(ptId => {
      const ptStr = weatherPoints[ptId];
      if (!ptStr) return { ptId, lat: 0, lng: 0 };
      const [lat, lng] = ptStr.split(',').map(Number);
      return { ptId, lat, lng };
    }).filter(wp => wp.lat !== 0 || wp.lng !== 0);

    let totalEffectiveDist = 0;
    if (routePositions.length > 0) {
      const segmentDist = 25;
      let tempAccDist = 0;
      let tempPhysicsIdx = 1;
      for (let i = 1; i < routePositions.length; i++) {
        const midpointDist = tempAccDist + segmentDist / 2;
        while (tempPhysicsIdx < physics.distances.length - 1 && physics.distances[tempPhysicsIdx] < midpointDist) {
          tempPhysicsIdx++;
        }
        const multiplier = physics.speedMultipliers[tempPhysicsIdx] || 1.0;
        totalEffectiveDist += segmentDist / multiplier;
        tempAccDist += segmentDist;
      }
      if (totalEffectiveDist === 0) totalEffectiveDist = 1;
    }

    rc = {
      routePositions,
      weatherPtCoords,
      totalEffectiveDist,
      durations: new Map()
    };
    routeCache.set(physics, rc);
  }

  if (rc.durations.has(durationMs)) {
    return rc.durations.get(durationMs)!;
  }

  const { routePositions, weatherPtCoords, totalEffectiveDist } = rc;

  if (routePositions.length === 0 || weatherPtCoords.length === 0) return [];

  let physicsIdx = 1;
  let accumulatedDist = 0;
  let currentEffectiveTimeMs = 0;
  let nextTargetTimeMs = 0;

  const intervalPoints: SimulationIntervalPoint[] = [];

  const addIntervalPoint = (targetMs: number, posIdx: number) => {
    const posLat = routePositions[posIdx][0];
    const posLng = routePositions[posIdx][1];

    // Find geographically closest weather point
    let closestWp = weatherPtCoords[0];
    let minDist = Infinity;
    for (const wp of weatherPtCoords) {
      const d = getDistance(wp.lat, wp.lng, posLat, posLng);
      if (d < minDist) {
        minDist = d;
        closestWp = wp;
      }
    }

    // Calculate bearing
    let bearing = null;
    for (let j = posIdx + 1; j < Math.min(posIdx + 15, routePositions.length); j++) {
      if (routePositions[j][0] !== posLat || routePositions[j][1] !== posLng) {
        bearing = getBearing(posLat, posLng, routePositions[j][0], routePositions[j][1]);
        break;
      }
    }

    intervalPoints.push({
      targetMs,
      posIdx,
      lat: posLat,
      lng: posLng,
      bearing,
      wpId: closestWp.ptId
    });
  };

  addIntervalPoint(nextTargetTimeMs, 0);
  nextTargetTimeMs += 30 * 60 * 1000;
  const segmentDist = 25;

  for (let i = 1; i < routePositions.length; i++) {
    const midpointDist = accumulatedDist + segmentDist / 2;
    while (physicsIdx < physics.distances.length - 1 && physics.distances[physicsIdx] < midpointDist) {
      physicsIdx++;
    }

    const multiplier = physics.speedMultipliers[physicsIdx] || 1.0;
    const effectiveSegment = segmentDist / multiplier;
    const timeForSegmentMs = effectiveSegment * (durationMs / totalEffectiveDist);

    currentEffectiveTimeMs += timeForSegmentMs;
    accumulatedDist += segmentDist;

    while (currentEffectiveTimeMs >= nextTargetTimeMs && nextTargetTimeMs <= durationMs) {
      addIntervalPoint(nextTargetTimeMs, i);
      nextTargetTimeMs += 30 * 60 * 1000;
    }
  }

  if (nextTargetTimeMs <= durationMs) {
    addIntervalPoint(durationMs, routePositions.length - 1);
  }

  rc.durations.set(durationMs, intervalPoints);
  return intervalPoints;
}
