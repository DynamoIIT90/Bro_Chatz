import { create } from 'zustand'

export interface Author {
  name: string
  handle: string
  avatar: string
}

export interface PostItem {
  id: string
  author: Author
  content: string
  images?: string[]
  createdAt: number
  likes: number
  comments: number
  shares: number
}

interface FeedState {
  posts: PostItem[]
  addPost: (post: PostItem) => void
  likePost: (id: string) => void
}

const initialPosts: PostItem[] = Array.from({length: 8}).map((_, i) => ({
  id: `seed-${i}`,
  author: {
    name: ['Ava','Kai','Maya','Zayn','Luna','Noah','Ivy','Milo'][i%8],
    handle: ['ava','kai','maya','zayn','luna','noah','ivy','milo'][i%8],
    avatar: ''
  },
  content: [
    'Chasing horizons 🌅',
    'New drop soon. Stay tuned.',
    'Coffee then conquer ☕',
    'Weekend grind mode on.',
    'Ship fast. Learn faster.',
    'Moments > things.',
    'Minimalism is a superpower.',
    'Today feels cinematic.'
  ][i%8],
  images: [],
  createdAt: Date.now() - i*3600_000,
  likes: Math.floor(Math.random()*200),
  comments: Math.floor(Math.random()*30),
  shares: Math.floor(Math.random()*20),
}))

const useFeedStore = create<FeedState>((set) => ({
  posts: initialPosts,
  addPost: (post) => set((s) => ({ posts: [post, ...s.posts] })),
  likePost: (id) => set((s) => ({
    posts: s.posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p)
  })),
}))

export default useFeedStore