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
import { useAuthStore, useThemeStore } from '../stores/useStore';

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
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  useEffect(() => {
    if (isAuthenticated && !user) fetchUser();
  }, [fetchUser, isAuthenticated, user]);

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#172338] transition-colors dark:bg-[#0c1522] dark:text-slate-100">
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-[#e1e7ef] bg-white px-4 py-3 dark:border-[#2a394b] dark:bg-[#121e2c] lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#183b67] text-white">
            <Brain className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">NeuGPT</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside
        className={`
          fixed left-0 top-0 z-40 h-full w-64 border-r border-[#e1e7ef] bg-white
          transform transition-transform duration-300 dark:border-[#2a394b] dark:bg-[#121e2c] lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#183b67] text-white">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <span className="block text-lg font-bold tracking-tight text-slate-900 dark:text-white">NeuGPT</span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">by Neuralways</span>
            </div>
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
                      ? 'border border-[#d6e1eb] bg-[#edf3f8] text-[#183b67] dark:border-[#37526f] dark:bg-[#1a314a] dark:text-[#b9d8f6]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-[#1a293c] dark:hover:text-white'
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
                    ? 'border border-[#d6e1eb] bg-[#edf3f8] text-[#183b67] dark:border-[#37526f] dark:bg-[#1a314a] dark:text-[#b9d8f6]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-[#1a293c] dark:hover:text-white'
                }`}
              >
                <Crown className="h-5 w-5" />
                <span>Admin</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[#e1e7ef] p-4 dark:border-[#2a394b]">
          <button
            onClick={() => toggleTheme()}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="mb-4 flex w-full items-center justify-between rounded-lg border border-[#d6e1eb] bg-[#edf3f8] px-3 py-2.5 text-sm font-medium text-[#183b67] transition hover:bg-[#e3edf6] dark:border-[#34465c] dark:bg-[#1a293c] dark:text-slate-100 dark:hover:bg-[#22344a]"
          >
            <span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-[#52769a]" />}
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
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
