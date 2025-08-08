import { Heart, UserPlus, MessageSquare } from 'lucide-react'

export default function NotificationsPage() {
  const items = [
    { icon: <Heart size={16} className="text-pink-500"/>, text: 'Ava liked your post' },
    { icon: <UserPlus size={16} className="text-emerald-500"/>, text: 'Kai followed you' },
    { icon: <MessageSquare size={16} className="text-sky-500"/>, text: 'Maya mentioned you' },
  ]
  return (
    <div className="rounded-2xl bg-zinc-950 border border-zinc-800">
      <div className="p-4 font-semibold border-b border-zinc-800">Notifications</div>
      <div className="divide-y divide-zinc-800">
        {items.map((it, i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            {it.icon}
            <div>{it.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}