import { create } from 'zustand'

const AURA_KEY = 'esclate:aura'
const LAST_ACTIVE_KEY = 'esclate:lastActive'

interface AuraState {
  aura: number
  lastActiveAt: number
  addAura: (amount: number) => void
  recordActive: () => void
  startAuraTimer: () => void
}

function loadNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key)
  const val = raw ? Number(raw) : NaN
  return Number.isFinite(val) ? val : fallback
}

export const useAuraStore = create<AuraState>((set, get) => ({
  aura: 0,
  lastActiveAt: Date.now(),
  addAura: (amount: number) => set((s) => {
    const next = Math.max(0, s.aura + amount)
    localStorage.setItem(AURA_KEY, String(next))
    return { aura: next }
  }),
  recordActive: () => set(() => {
    const now = Date.now()
    localStorage.setItem(LAST_ACTIVE_KEY, String(now))
    return { lastActiveAt: now }
  }),
  startAuraTimer: () => {
    // Restore persisted values
    const initialAura = loadNumber(AURA_KEY, 0)
    const lastActive = loadNumber(LAST_ACTIVE_KEY, Date.now())
    set({ aura: initialAura, lastActiveAt: lastActive })

    let accumulatedMs = 0
    let lastTick = performance.now()

    const onActivity = () => get().recordActive()
    const activityEvents: string[] = ['visibilitychange']
    const windowEvents: string[] = ['mousemove','keydown','scroll','click','touchstart']

    activityEvents.forEach(ev => document.addEventListener(ev as any, onActivity))
    windowEvents.forEach(ev => window.addEventListener(ev as any, onActivity))

    const interval = setInterval(() => {
      const now = performance.now()
      const delta = now - lastTick
      lastTick = now

      if (document.visibilityState !== 'visible') {
        return
      }

      accumulatedMs += delta
      if (accumulatedMs >= 5 * 60 * 1000) {
        const chunks = Math.floor(accumulatedMs / (5 * 60 * 1000))
        accumulatedMs -= chunks * 5 * 60 * 1000
        get().addAura(chunks)
      }
    }, 1000)

    window.addEventListener('beforeunload', () => clearInterval(interval))
  },
}))

export default useAuraStore