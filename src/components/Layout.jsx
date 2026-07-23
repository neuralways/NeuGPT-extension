import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Brain,
  CreditCard,
  History,
  LayoutDashboard,
  Linkedin,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  X,
  Youtube,
  Crown,
} from 'lucide-react';
import { useAuthStore, useThemeStore, useAppStore } from '../stores/useStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/linkedin', label: 'LinkedIn', icon: Linkedin },
  { path: '/youtube', label: 'YouTube', icon: Youtube },
  { path: '/history', label: 'History', icon: History },
  { path: '/subscription', label: 'Subscription', icon: CreditCard },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout, fetchUser, isAuthenticated, isAdmin } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { globalStats, fetchGlobalStats } = useAppStore();

  useEffect(() => {
    if (isAuthenticated && !user) fetchUser();
  }, [fetchUser, isAuthenticated, user]);

  useEffect(() => {
    if (user && !globalStats) {
      fetchGlobalStats(user.email);
    }
  }, [user, globalStats, fetchGlobalStats]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary-500" />
          <span className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500">NeuGPT</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside
        className={`
          fixed left-0 top-0 z-40 h-full w-64 border-r border-slate-200 bg-white
          transform transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6">
          <div className="mb-8 flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary-500" />
            <span className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500">NeuGPT</span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? 'border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/20 dark:text-primary-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {isAdmin() && (
              <Link
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 ${
                  location.pathname === '/admin'
                    ? 'border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/20 dark:text-primary-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <Crown className="h-5 w-5" />
                <span>Admin</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4 dark:border-slate-800">
          <button
            onClick={() => toggleTheme()}
            className="mb-4 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <div className="mb-4 flex items-center gap-3 px-2">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500">
                <span className="font-semibold text-white">
                  {user?.name?.[0] || user?.email?.[0] || 'U'}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user?.name || 'Logged in user'}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || 'Authenticated'}</p>
            </div>
          </div>
          
          {globalStats && globalStats.daily_limit > 0 && (
            <div className="mb-4 px-2">
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Daily Mail Quota</span>
                <span>{globalStats.daily_sent} / {globalStats.daily_limit}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full ${globalStats.daily_sent >= globalStats.daily_limit ? 'bg-red-500' : 'bg-primary-500'}`}
                  style={{ width: `${Math.min((globalStats.daily_sent / globalStats.daily_limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="min-h-screen pt-16 lg:ml-64 lg:pt-0">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
