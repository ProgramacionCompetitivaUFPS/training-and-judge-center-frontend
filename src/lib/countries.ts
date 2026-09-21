import { registerLocale, getNames } from 'i18n-iso-countries'
import esLocale from 'i18n-iso-countries/langs/es.json'

registerLocale(esLocale)

export interface Country {
  code: string
  name: string
}

// The platform's userbase is overwhelmingly Latin American — surface these first (each group
// alphabetical on its own) so the common case doesn't require scrolling or searching past the
// rest of the world.
const LATIN_AMERICAN_CODES = ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'UY', 'VE']

// Static ISO 3166-1 list embedded in the frontend (see USR-10 in docs/seguimiento/backlog.md
// for the design decision) — no backend endpoint involved. City/institution stay free text;
// country becomes a closed list because, unlike them, a small stable enumeration genuinely
// covers every real case. `code` is only used to derive the Spanish name below; the value
// actually stored on the user is the name itself, since that's the shape the backend's
// `country` field (plain free text, no ISO-code concept) already expects.
export const COUNTRIES: Country[] = (() => {
  const all = Object.entries(getNames('es')).map(([code, name]) => ({ code, name }))
  const byName = (a: Country, b: Country) => a.name.localeCompare(b.name, 'es')
  const isLatam = (c: Country) => LATIN_AMERICAN_CODES.includes(c.code)
  return [
    ...all.filter(isLatam).sort(byName),
    ...all.filter((c) => !isLatam(c)).sort(byName),
  ]
})()

// A user's stored country may predate this list, or not match any entry exactly (typos,
// abbreviations, different casing). Rather than silently blank out a select on existing data,
// surface the current value as its own option so the field never looks empty when it isn't.
export function getCountryOptions(currentValue?: string | null): Country[] {
  if (currentValue && !COUNTRIES.some((c) => c.name === currentValue)) {
    return [{ code: 'current', name: currentValue }, ...COUNTRIES]
  }
  return COUNTRIES
}
