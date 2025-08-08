import { useEffect, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import useAuraStore from '../store/useAuraStore'

export default function AuraMeter() {
  const aura = useAuraStore(s => s.aura)
  const startAuraTimer = useAuraStore(s => s.startAuraTimer)

  useEffect(() => {
    startAuraTimer()
  }, [startAuraTimer])

  const tier = useMemo(() => {
    if (aura >= 200) return { name: 'Mythic', color: 'from-fuchsia-500 to-cyan-400' }
    if (aura >= 100) return { name: 'Legend', color: 'from-amber-400 to-red-500' }
    if (aura >= 50) return { name: 'Epic', color: 'from-violet-500 to-pink-500' }
    if (aura >= 20) return { name: 'Rare', color: 'from-sky-500 to-emerald-400' }
    return { name: 'Common', color: 'from-zinc-500 to-zinc-300' }
  }, [aura])

  const progress = Math.min(100, (aura % 20) * (100 / 20))

  return (
    <div className="rounded-xl bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <Sparkles className="text-yellow-400" size={16}/>
          Aura
        </div>
        <div className="text-xs text-zinc-400">1 per 5 min active</div>
      </div>
      <div className="text-2xl font-bold">{aura}</div>
      <div className="text-xs text-zinc-400">Tier: {tier.name}</div>
      <div className="mt-3 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${tier.color}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}