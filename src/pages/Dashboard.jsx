import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Linkedin, Mail } from 'lucide-react';
import { historyAPI } from '../services/api';
import { useAuthStore, useAppStore } from '../stores/useStore';

const activityItems = [
  {
    key: 'linkedin_searches',
    label: 'LinkedIn analyses',
    icon: Linkedin,
    tone: 'bg-[#edf3f8] text-[#356797] dark:bg-sky-500/10 dark:text-sky-300',
    fallbackValue: '10+',
  },
  {
    key: 'emails_sent',
    label: 'Emails sent',
    icon: Mail,
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    fallbackValue: '250+',
  },
];

export default function Dashboard() {
  const { user, profile, fetchUser, fetchProfile, isAuthenticated } = useAuthStore();
  const { setStats } = useAppStore();
  const [activity, setActivity] = useState(null);
  const [activityStatus, setActivityStatus] = useState('loading');

  const userEmail = user?.email || profile?.email;
  const displayName = user?.name || profile?.name;
  const firstName = displayName?.split(' ')[0] || userEmail?.split('@')[0] || 'there';

  useEffect(() => {
    if (isAuthenticated && !user) fetchUser();
    if (isAuthenticated && !profile) fetchProfile();
  }, [fetchProfile, fetchUser, isAuthenticated, profile, user]);

  useEffect(() => {
    if (!isAuthenticated || !userEmail) {
      setActivity(null);
      setActivityStatus('loading');
      return undefined;
    }

    let active = true;
    setActivity(null);
    setActivityStatus('loading');

    const loadActivity = async () => {
      try {
        const response = await historyAPI.getStats(userEmail);
        const data = response.data;

        if (
          !data ||
          !Number.isFinite(data.linkedin_searches) ||
          !Number.isFinite(data.emails_sent)
        ) {
          throw new Error('Activity statistics were incomplete.');
        }

        if (active) {
          setActivity(data);
          setStats(data);
          setActivityStatus('ready');
        }
      } catch {
        if (active) setActivityStatus('fallback');
      }
    };

    loadActivity();
    return () => {
      active = false;
    };
  }, [isAuthenticated, setStats, userEmail]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#52769a] dark:text-sky-300">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#172338] dark:text-white sm:text-[38px]">
          Welcome back, {firstName}.
        </h1>
      </header>

      <section
        aria-labelledby="outreach-heading"
        className="rounded-2xl bg-[#183b67] p-6 text-white sm:p-8"
      >
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-100">
              LinkedIn outreach
            </p>
            <h2
              id="outreach-heading"
              className="mt-3 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl"
            >
              Turn hiring posts into thoughtful first emails.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Collect relevant LinkedIn posts, draft recruiter emails, and review each message before sending.
            </p>
            <Link
              to="/linkedin"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-[#183b67] transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#183b67]"
            >
              Open LinkedIn workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:flex">
            <Linkedin className="h-7 w-7" aria-hidden="true" />
          </span>
        </div>
      </section>

      <section aria-labelledby="activity-heading">
        <div className="mb-4">
          <h2
            id="activity-heading"
            className="text-lg font-semibold tracking-[-0.02em] text-[#172338] dark:text-white"
          >
            Your activity
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {activityStatus === 'fallback'
              ? 'Example figures · account activity unavailable'
              : 'All time'}
          </p>
        </div>

        <div
          aria-busy={activityStatus === 'loading'}
          className="grid gap-4 sm:grid-cols-2"
        >
          {activityItems.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.key}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-[#2a394b] dark:bg-[#121e2c]"
              >
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-[#172338] dark:text-white">
                    {activityStatus === 'loading' ? (
                      <span className="block h-9 w-12 animate-pulse rounded bg-slate-200 dark:bg-[#34465c]" />
                    ) : activityStatus === 'ready' ? (
                      activity[item.key].toLocaleString()
                    ) : (
                      item.fallbackValue
                    )}
                  </p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
