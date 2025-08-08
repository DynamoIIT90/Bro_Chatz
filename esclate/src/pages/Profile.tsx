export default function ProfilePage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-zinc-800">
        <div className="h-40 bg-gradient-to-r from-zinc-800 to-zinc-700"/>
        <div className="p-4">
          <div className="flex items-end gap-4 -mt-10">
            <div className="h-20 w-20 rounded-full bg-zinc-900 border-2 border-zinc-800"/>
            <div>
              <div className="text-xl font-bold">You</div>
              <div className="text-zinc-400">@you</div>
            </div>
            <div className="ml-auto"><button className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1">Edit Profile</button></div>
          </div>
          <div className="mt-3 text-sm text-zinc-300">Bio goes here. Building Esclate 🚀</div>
        </div>
      </div>

      <div className="flex gap-2">
        {['Posts','Replies','Media','Likes'].map(t => (
          <button key={t} className="rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-sm">{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({length:12}).map((_,i)=> (
          <div key={i} className="aspect-square rounded-xl bg-zinc-900"/>
        ))}
      </div>
    </div>
  )
}