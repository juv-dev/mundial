import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

const STORAGE_KEY = 'mundial:participant'

interface ParticipantCtx {
  participant: string | null
  setParticipant: (name: string) => void
}

const ParticipantContext = createContext<ParticipantCtx>({
  participant: null,
  setParticipant: () => {},
})

export function ParticipantProvider({ children }: { children: ReactNode }) {
  const [participant, setParticipantState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const setParticipant = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      localStorage.setItem(STORAGE_KEY, trimmed)
    } catch {
    }
    setParticipantState(trimmed)
  }, [])

  return (
    <ParticipantContext.Provider value={{ participant, setParticipant }}>
      {children}
    </ParticipantContext.Provider>
  )
}

export function useParticipant() {
  return useContext(ParticipantContext)
}
