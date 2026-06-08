// Country names are derived from the ISO 3166-1 alpha-2 codes stored in the
// DB (server/geoLookup.ts persists r.country?.isoCode). The DB never stores
// localized full names, so the conversion happens at display time.
const REGION_NAMES = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

function countryName(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "";
  try {
    const name = REGION_NAMES?.of(trimmed);
    return name && name !== trimmed ? name : trimmed;
  } catch {
    return trimmed;
  }
}

export function formatLocation(
  city: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const c = (city ?? "").trim();
  const co = (country ?? "").trim();
  if (!c && !co) return null;
  if (c && !co) return c;
  if (!c && co) return countryName(co);
  return `${c}, ${countryName(co)}`;
}
