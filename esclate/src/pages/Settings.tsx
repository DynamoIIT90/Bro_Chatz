import useAuraStore from '../store/useAuraStore'

export default function SettingsPage() {
  const aura = useAuraStore(s => s.aura)
  const addAura = useAuraStore(s => s.addAura)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
        <div className="font-semibold mb-2">Appearance</div>
        <div className="text-sm text-zinc-400">Dark theme is enabled by default.</div>
      </div>
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
        <div className="font-semibold mb-2">Aura Debug</div>
        <div className="text-sm text-zinc-400">Current Aura: {aura}</div>
        <div className="mt-2 flex gap-2">
          <button onClick={()=>addAura(1)} className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-1 text-sm">+1</button>
          <button onClick={()=>addAura(5)} className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-1 text-sm">+5</button>
          <button onClick={()=>addAura(20)} className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-1 text-sm">+20</button>
        </div>
      </div>
    </div>
  )
}