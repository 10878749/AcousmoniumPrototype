// app/utils/panningAlgorithm.ts

/**
 * Calculates the Euclidean distance between two points (x1, y1) and (x2, y2).
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Converts a distance to a volume ratio in the [0,1] range.
 * If distance >= maxDistance, the volume is 0.
 * If distance = 0, the volume is 1.
 * Otherwise volume = 1 - (distance / maxDistance).
 */
export function distanceToVolume(distance: number, maxDistance: number): number {
    if (distance >= maxDistance) {
        return 0;
    }
    const volume = 1 - distance / maxDistance;
    return Math.max(0, Math.min(volume, 1)); // clamp to [0,1]
}
