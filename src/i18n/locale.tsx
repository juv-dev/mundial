import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface CountryConfig {
  label: string
  flag: string
  locale: string
  timeZone: string
}

export type CountryKey = 'peru' | 'spain'

export const COUNTRIES: Record<CountryKey, CountryConfig> = {
  peru: { label: 'Perú', flag: '🇵🇪', locale: 'es-PE', timeZone: 'America/Lima' },
  spain: { label: 'España', flag: '🇪🇸', locale: 'es-ES', timeZone: 'Europe/Madrid' },
}

const STORAGE_KEY = 'app-country'

interface LocaleContextValue {
  country: CountryConfig
  countryKey: CountryKey
  setCountry: (key: CountryKey) => void
  countries: Record<CountryKey, CountryConfig>
  formatDateTime: (iso: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [countryKey, setCountryKey] = useState<CountryKey>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null && stored in COUNTRIES ? (stored as CountryKey) : 'peru'
  })

  const setCountry = useCallback((key: CountryKey) => {
    localStorage.setItem(STORAGE_KEY, key)
    setCountryKey(key)
  }, [])

  const country = COUNTRIES[countryKey]

  const formatDateTime = useCallback(
    (iso: string): string => {
      if (!iso) return ''
      const date = new Date(iso)
      if (isNaN(date.getTime())) return ''
      const fecha = new Intl.DateTimeFormat(country.locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: country.timeZone,
      })
        .format(date)
        .replace(/\./g, '')
        .replace(',', '')
      const hora = new Intl.DateTimeFormat(country.locale, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: country.timeZone,
      })
        .format(date)
        .replace(/\s*a\.?\s*m\.?/i, ' AM')
        .replace(/\s*p\.?\s*m\.?/i, ' PM')
        .trim()
      return `${fecha} · ${hora}`
    },
    [country],
  )

  return (
    <LocaleContext.Provider value={{ country, countryKey, setCountry, countries: COUNTRIES, formatDateTime }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider')
  return ctx
}
