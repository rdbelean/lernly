// =========================================================================
// Provider / Anbieter — single source of truth for every legal page that
// has to name us (Impressum, Widerrufsbelehrung, Datenschutz, AGB).
// Change values HERE; both `/impressum` and `/widerruf` pick them up.
// =========================================================================

export const PROVIDER = {
  name: "Rares Daniel Belean",
  street: "Am Hang 4",
  postal: "69151",
  city: "Neckargemünd",
  country: "Deutschland",
  email: "info@lernly-app.de",
  phone: "+49 151 18164381",
} as const;

/**
 * Compact one-line form used inside the Widerrufsbelehrung body
 * ("Um Ihr Widerrufsrecht auszuüben, müssen Sie uns …").
 */
export function providerInline(): string {
  return `${PROVIDER.name}, ${PROVIDER.street}, ${PROVIDER.postal} ${PROVIDER.city}, ${PROVIDER.country}, E-Mail: ${PROVIDER.email}`;
}
