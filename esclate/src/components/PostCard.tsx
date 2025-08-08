import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react'
import type { PostItem } from '../store/useFeedStore'
import useFeedStore from '../store/useFeedStore'

interface Props { post: PostItem }

export default function PostCard({ post }: Props) {
  const like = useFeedStore(s => s.likePost)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-zinc-800" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="font-semibold truncate">{post.author.name}</div>
              <div className="text-zinc-400 text-sm truncate">@{post.author.handle}</div>
              <div className="text-zinc-600 text-sm">· {new Date(post.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
            <button className="p-1 rounded-md hover:bg-zinc-900"><MoreHorizontal size={16}/></button>
          </div>
          <div className="mt-2 whitespace-pre-wrap">{post.content}</div>
          {post.images && post.images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {post.images.map((src,i)=> (
                <img key={i} src={src} className="rounded-lg object-cover aspect-square" />
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-4 text-zinc-400 text-sm">
            <button onClick={()=>like(post.id)} className="inline-flex items-center gap-1 hover:text-white"><Heart size={16}/> {post.likes}</button>
            <button className="inline-flex items-center gap-1 hover:text-white"><MessageCircle size={16}/> {post.comments}</button>
            <button className="inline-flex items-center gap-1 hover:text-white"><Share2 size={16}/> {post.shares}</button>
          </div>
        </div>
      </div>
    </div>
  )
}