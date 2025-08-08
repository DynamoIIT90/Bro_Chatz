import { Search } from 'lucide-react'

export default function ExplorePage() {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
        <input className="w-full rounded-lg bg-zinc-900 pl-9 pr-3 py-2 border border-zinc-800 outline-none focus:border-zinc-700" placeholder="Search Esclate"/>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({length:18}).map((_,i)=> (
          <div key={i} className="aspect-square rounded-xl bg-zinc-900"/>
        ))}
      </div>
    </div>
  )
}