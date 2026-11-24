/**
 * The place aboard an alert concerns, where it adds to the message. An NMEA
 * 2000 alert sends the place apart from its text, and several alerts can share
 * a text ("Highwater" for each bilge), so the text alone does not say which
 * one sounds. A message that already names the place needs no more.
 */
export function alertPlace(alert: {
  message: string;
  location?: string;
}): string | undefined {
  const { message, location } = alert;
  if (!location || (message && namesPlace(message, location))) {
    return undefined;
  }
  return location;
}

/** An alert's message followed by its place (see alertPlace()). */
export function alertText(alert: {
  message: string;
  location?: string;
}): string {
  const place = alertPlace(alert);
  if (!place) {
    return alert.message;
  }
  return alert.message ? `${alert.message} · ${place}` : place;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Whether the message has the location as whole words, in any case. A
 * location that starts or ends with punctuation needs no word break there.
 */
function namesPlace(message: string, location: string): boolean {
  const chars = [...location];
  const escaped = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const before = WORD_CHAR.test(chars[0]) ? '(^|[^\\p{L}\\p{N}])' : '';
  const after = WORD_CHAR.test(chars[chars.length - 1])
    ? '($|[^\\p{L}\\p{N}])'
    : '';
  return new RegExp(`${before}${escaped}${after}`, 'iu').test(message);
}
