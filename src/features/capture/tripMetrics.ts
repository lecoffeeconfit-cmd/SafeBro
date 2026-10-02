import { LocationSample } from '../../types/models';

export function tripDistanceKm(samples: LocationSample[]): number {
  let total = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if ((previous.accuracyMeters ?? 0) > 100 || (current.accuracyMeters ?? 0) > 100) continue;
    const radians = Math.PI / 180;
    const dLatitude = (current.latitude - previous.latitude) * radians;
    const dLongitude = (current.longitude - previous.longitude) * radians;
    const a = Math.sin(dLatitude / 2) ** 2 + Math.cos(previous.latitude * radians) * Math.cos(current.latitude * radians) * Math.sin(dLongitude / 2) ** 2;
    const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distance < 0.5) total += distance;
  }
  return total;
}
