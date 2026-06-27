export const realtimeGlobalChannel = "reservation:global";

export function getVenueRealtimeChannel(venueId: string) {
  return `reservation:venue:${venueId}`;
}
