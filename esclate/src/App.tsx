import { Routes, Route, NavLink, Outlet } from 'react-router-dom'
import { Flame, Home, Compass, MessageSquare, Bell, User, Settings, Plus } from 'lucide-react'
import { Suspense } from 'react'
import HomePage from './pages/Home'
import ExplorePage from './pages/Explore'
import MessagesPage from './pages/Messages'
import NotificationsPage from './pages/Notifications'
import ProfilePage from './pages/Profile'
import SettingsPage from './pages/Settings'
import AuraMeter from './components/AuraMeter'
import Composer from './components/Composer'
import useUIStore from './store/useUIStore'

function MainLayout() {
  const openComposer = useUIStore(s => s.openComposer)
  return (
    <div className="min-h-full grid grid-cols-[280px_1fr_360px] gap-6 max-w-[1400px] mx-auto px-6 py-6">
      <aside className="hidden lg:flex flex-col gap-2">
        <div className="text-2xl font-bold tracking-tight mb-4">Esclate</div>
        <NavLink className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 ${isActive? 'bg-zinc-900 text-white' : 'text-zinc-300'}`} to="/">
          <Home size={18}/> Home
        </NavLink>
        <NavLink className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 ${isActive? 'bg-zinc-900 text-white' : 'text-zinc-300'}`} to="/explore">
          <Compass size={18}/> Explore
        </NavLink>
        <NavLink className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 ${isActive? 'bg-zinc-900 text-white' : 'text-zinc-300'}`} to="/messages">
          <MessageSquare size={18}/> Messages
        </NavLink>
        <NavLink className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 ${isActive? 'bg-zinc-900 text-white' : 'text-zinc-300'}`} to="/notifications">
          <Bell size={18}/> Notifications
        </NavLink>
        <NavLink className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 ${isActive? 'bg-zinc-900 text-white' : 'text-zinc-300'}`} to="/profile">
          <User size={18}/> Profile
        </NavLink>
        <NavLink className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 ${isActive? 'bg-zinc-900 text-white' : 'text-zinc-300'}`} to="/settings">
          <Settings size={18}/> Settings
        </NavLink>

        <button onClick={openComposer} className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[rgb(var(--brand))] text-white px-4 py-2 font-medium">
          <Plus size={18}/> Create
        </button>

        <div className="mt-6"><AuraMeter/></div>
      </aside>

      <main className="min-w-0">
        <Suspense fallback={<div className="p-6 text-zinc-400">Loading…</div>}>
          <Outlet />
        </Suspense>
      </main>

      <aside className="hidden xl:flex flex-col gap-4">
        <div className="flex items-center gap-2 text-zinc-300"><Flame className="text-red-400" size={18}/> Trending</div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({length:9}).map((_,i)=> (
            <div key={i} className="aspect-square rounded-lg bg-zinc-900" />
          ))}
        </div>
        <div className="rounded-xl bg-zinc-900 p-4">
          <div className="font-semibold mb-2">Suggestions</div>
          <div className="space-y-2">
            {['Ava','Kai','Maya'].map(name=> (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-zinc-800"/>
                  <div className="text-sm">
                    <div className="font-medium">{name}</div>
                    <div className="text-zinc-400">@{name.toLowerCase()}</div>
                  </div>
                </div>
                <button className="text-xs rounded-md bg-zinc-800 px-3 py-1">Follow</button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <Composer/>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout/>}>
        <Route index element={<HomePage/>} />
        <Route path="explore" element={<ExplorePage/>} />
        <Route path="messages" element={<MessagesPage/>} />
        <Route path="notifications" element={<NotificationsPage/>} />
        <Route path="profile" element={<ProfilePage/>} />
        <Route path="settings" element={<SettingsPage/>} />
      </Route>
    </Routes>
  )
}
