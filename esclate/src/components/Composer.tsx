import { useState } from 'react'
import { X, Image as ImageIcon, Smile, Hash } from 'lucide-react'
import useUIStore from '../store/useUIStore'
import { v4 as uuid } from 'uuid'
import useFeedStore from '../store/useFeedStore'

export default function Composer() {
  const isOpen = useUIStore(s => s.isComposerOpen)
  const close = useUIStore(s => s.closeComposer)
  const addPost = useFeedStore(s => s.addPost)
  const [text, setText] = useState('')

  if (!isOpen) return null

  const onPost = () => {
    if (!text.trim()) return
    addPost({
      id: uuid(),
      author: {
        name: 'You',
        handle: 'you',
        avatar: ''
      },
      content: text,
      createdAt: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      images: []
    })
    setText('')
    close()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="font-semibold">Create Post</div>
          <button onClick={close} className="p-1 hover:bg-zinc-900 rounded-md">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={text}
            onChange={(e)=>setText(e.target.value)}
            rows={5}
            placeholder="What's escalating today?"
            className="w-full resize-none rounded-lg bg-zinc-900 p-3 outline-none border border-zinc-800 focus:border-zinc-700"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-400">
              <button className="p-2 hover:bg-zinc-900 rounded-md"><ImageIcon size={16}/></button>
              <button className="p-2 hover:bg-zinc-900 rounded-md"><Smile size={16}/></button>
              <button className="p-2 hover:bg-zinc-900 rounded-md"><Hash size={16}/></button>
            </div>
            <button onClick={onPost} className="rounded-lg bg-[rgb(var(--brand))] text-white px-4 py-2 text-sm font-medium">Post</button>
          </div>
        </div>
      </div>
    </div>
  )
}