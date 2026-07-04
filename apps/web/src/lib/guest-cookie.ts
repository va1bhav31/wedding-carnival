/** Cookie that remembers which guest row this browser is, per wedding. */
export function guestCookieName(weddingId: string) {
  return `wc_guest_${weddingId}`;
}
