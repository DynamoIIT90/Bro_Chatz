import PostCard from '../components/PostCard'
import useFeedStore from '../store/useFeedStore'
import useUIStore from '../store/useUIStore'
import { Plus } from 'lucide-react'

export default function HomePage() {
  const posts = useFeedStore(s => s.posts)
  const openComposer = useUIStore(s => s.openComposer)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button onClick={openComposer} className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-sm border border-zinc-800"><Plus size={14}/> Create</button>
        {Array.from({length:10}).map((_,i)=> (
          <div key={i} className="shrink-0 h-12 w-12 rounded-full bg-gradient-to-tr from-[rgb(var(--brand))] to-pink-500 p-[2px]">
            <div className="h-full w-full rounded-full bg-zinc-900" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {posts.map(p => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  )
}