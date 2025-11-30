import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CogIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import clsx from 'clsx'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, hasPermission } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, public: true },
    { name: 'IOCs', href: '/iocs', icon: ShieldCheckIcon, public: true },
    { name: 'Lookup', href: '/lookup', icon: MagnifyingGlassIcon, public: true },
    { name: 'Tags', href: '/tags', icon: TagIcon, requireAuth: true },
    { name: 'Admin', href: '/admin', icon: CogIcon, permission: 'admin' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <div className="flex flex-col h-full text-gray-300">
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-all duration-300"></div>
            <img src="/logo.svg" alt="Vortex Logo" className="w-8 h-8 relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-wide group-hover:text-primary transition-colors">Vortex</span>
            <span className="text-[10px] text-primary/80 font-mono tracking-wider uppercase">Cyber Threat Intelligence</span>
          </div>
        </Link>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          if (item.public) {
            // Show for everyone
          } else if (item.requireAuth) {
            if (!user) return null
          } else if (item.permission) {
            if (!user || !hasPermission(item.permission)) return null
          }

          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => mobile && setSidebarOpen(false)}
              className={clsx(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden',
                isActive
                  ? 'text-white bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(0,229,255,0.1)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(0,229,255,0.5)]"></div>
              )}
              <item.icon className={clsx("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
              <span className="font-medium tracking-wide">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary p-[1px]">
                <div className="w-full h-full rounded-full bg-background-lighter flex items-center justify-center">
                  <UserCircleIcon className="w-6 h-6 text-gray-300" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate font-mono">
                  {user?.username}
                </p>
                <p className="text-xs text-primary uppercase tracking-wider font-bold">
                  {user?.role}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/profile"
                onClick={() => mobile && setSidebarOpen(false)}
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 hover:text-white rounded-md transition-colors border border-white/5"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors border border-red-500/10 group"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-1 group-hover:translate-x-1 transition-transform" />
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
              <p className="text-sm font-medium text-white mb-1">Access Intelligence</p>
              <p className="text-xs text-gray-400 mb-3">Login to view full details</p>
              <Link
                to="/login"
                className="block w-full py-2 px-4 bg-primary text-background-darker font-bold text-center rounded hover:bg-primary-hover transition-colors shadow-neon text-sm"
              >
                Login Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex bg-cyber-grid overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col z-20">
        <div className="glass-panel h-full border-r border-white/10 flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 glass-panel h-full border-r border-white/10 animate-slide-up">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Mobile header */}
        <div className="lg:hidden glass-panel border-b border-white/10 z-30">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-2">
              <img src="/logo.svg" alt="Logo" className="w-6 h-6" />
              <span className="font-bold text-white tracking-wide">Vortex</span>
            </div>
            
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Background decoration */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px]"></div>
      </div>
    </div>
  )
}

export default Layout
