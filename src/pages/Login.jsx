import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../stores/useStore';
import {
  ArrowRight,
  Brain,
  Check,
  Linkedin,
  Mail,
  Moon,
  Send,
  Sun,
} from 'lucide-react';

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  return (
    <main className="min-h-screen bg-[#f4f6f9] px-5 py-6 text-[#172338] dark:bg-[#0c1522] dark:text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#183b67] text-white">
              <Brain className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-5 tracking-tight">NeuGPT</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                by Neuralways
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleTheme()}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d8dee7] bg-white text-[#52647a] transition hover:bg-[#f7f8fa] dark:border-[#34465c] dark:bg-[#1a293c] dark:text-slate-200 dark:hover:bg-[#22344a]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <section className="my-auto py-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#356797] dark:text-[#9dc2e8]">
            Thoughtful outreach. Better opportunities.
          </p>
          <h1 className="mt-4 text-[36px] font-semibold leading-[1.08] tracking-[-0.05em] sm:text-[42px]">
            Make your next career move a conversation.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#59677a] dark:text-slate-300">
            Turn LinkedIn hiring posts into thoughtful emails to recruiters. Collect posts, prepare a draft, and review it before sending.
          </p>

          <div className="mt-7 grid grid-cols-3 divide-x divide-[#e1e7ef] rounded-xl border border-[#e1e7ef] bg-white py-4 dark:divide-[#2a394b] dark:border-[#2a394b] dark:bg-[#121e2c]">
            <div className="flex flex-col items-center gap-2 px-2 text-center">
              <Linkedin className="h-4 w-4 text-[#52769a] dark:text-[#9dc2e8]" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Find posts</span>
            </div>
            <div className="flex flex-col items-center gap-2 px-2 text-center">
              <Mail className="h-4 w-4 text-[#52769a] dark:text-[#9dc2e8]" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Draft emails</span>
            </div>
            <div className="flex flex-col items-center gap-2 px-2 text-center">
              <Send className="h-4 w-4 text-[#52769a] dark:text-[#9dc2e8]" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Review &amp; send</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#dce2e9] bg-white p-5 dark:border-[#2a394b] dark:bg-[#121e2c]">
            <button
              type="button"
              onClick={login}
              disabled={isLoading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#183b67] px-5 text-sm font-semibold text-white transition hover:bg-[#102e54] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleMark />
              {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
              {!isLoading && <ArrowRight className="h-4 w-4 text-white/75" />}
            </button>
            <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#778397] dark:text-slate-400">
              <Check className="h-3.5 w-3.5 shrink-0 text-[#41816f]" />
              Secure sign-in · You review every email before sending
            </p>
          </div>
        </section>

        <footer className="border-t border-[#e1e7ef] pt-4 text-center text-xs text-slate-500 dark:border-[#2a394b] dark:text-slate-400">
          Need help?{' '}
          <a
            href="mailto:neuralways@zohomail.in"
            className="font-semibold text-[#356797] hover:underline dark:text-[#9dc2e8]"
          >
            Contact the Neuralways team
          </a>
        </footer>
      </div>
    </main>
  );
}
