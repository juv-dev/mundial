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
      return new Intl.DateTimeFormat(country.locale, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: country.timeZone,
      }).format(date)
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
