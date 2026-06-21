import { useState } from 'react'
import { useParticipant } from '../hooks/useParticipant'

export function ParticipantPicker({ onClose }: { onClose: () => void }) {
  const { participant, setParticipant } = useParticipant()
  const [name, setName] = useState(participant ?? '')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setParticipant(trimmed)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cal/40 backdrop-blur-sm">
      <div className="card p-6 max-w-xs w-full mx-4 shadow-xl">
        <h2 className="font-head text-xl mb-1 text-cal">¿Quién juega?</h2>
        <p className="text-sm text-tiza mb-4">
          Ingresa tu nombre para guardar tus pronósticos.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Tu nombre"
          className="w-full px-3 py-2 rounded-lg border border-cal/20 bg-crema text-cal placeholder:text-tiza/50 focus:border-mag focus:outline-none mb-4"
          autoFocus
        />
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full py-2 rounded-lg text-sm font-semibold text-white bg-mag hover:bg-mag/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Entrar
        </button>
      </div>
    </div>
  )
}
