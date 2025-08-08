export default function MessagesPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 min-h-[60vh]">
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3">
        <div className="font-semibold mb-2">Chats</div>
        <div className="space-y-2">
          {['Ava','Kai','Maya','Zayn','Luna'].map(name => (
            <div key={name} className="rounded-lg p-3 hover:bg-zinc-900 cursor-pointer">
              <div className="font-medium">{name}</div>
              <div className="text-xs text-zinc-400">Last message preview…</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 flex flex-col">
        <div className="font-semibold mb-2">Chat with Ava</div>
        <div className="flex-1 space-y-2 overflow-auto">
          {Array.from({length:8}).map((_,i)=> (
            <div key={i} className={`max-w-[70%] rounded-xl p-2 ${i%2? 'bg-zinc-900 self-end':'bg-zinc-800'}`}>Message {i+1}</div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 border border-zinc-800 outline-none" placeholder="Type a message"/>
          <button className="rounded-lg bg-[rgb(var(--brand))] text-white px-4">Send</button>
        </div>
      </div>
    </div>
  )
}