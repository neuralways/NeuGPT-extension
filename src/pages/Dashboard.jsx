import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Brain, Linkedin, Mail, Youtube, Zap, Crown, CreditCard, Users, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { historyAPI, linkedinAPI, subscriptionAPI } from '../services/api';
import { useAppStore, useAuthStore } from '../stores/useStore';

export default function Dashboard() {
  const { user, profile, fetchUser, fetchProfile, isAuthenticated, isAdmin } = useAuthStore();
  const { stats, setStats } = useAppStore();
  const [loading, setLoading] = useState(true);

  const userId = user?.email;
  const userEmail = user?.email || profile?.email;
  const isUserAdmin = isAdmin();

  useEffect(() => {
    if (isAuthenticated && !user) fetchUser();
    if (isAuthenticated && !profile) fetchProfile();
  }, [fetchProfile, fetchUser, isAuthenticated, profile, user]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        if (!userId) {
          setLoading(false);
          return;
        }

        const response = await historyAPI.getStats(userId);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!userId && !userEmail) {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [setStats, userEmail, userId]);

  const values = useMemo(() => {
    const youtube = stats?.youtube_analyses || 0;
    const linkedin = stats?.linkedin_searches || 0;
    const sent = stats?.emails_sent || 0;
    return {
      youtube,
      linkedin,
      sent,
      total: youtube + linkedin,
    };
  }, [stats]);

  const statCards = [
    {
      title: 'YouTube Analyses',
      value: values.youtube,
      icon: Youtube,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-500/10',
      path: '/youtube',
    },
    {
      title: 'LinkedIn Analyses',
      value: values.linkedin,
      icon: Linkedin,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      path: '/linkedin',
    },
    {
      title: 'Emails Sent',
      value: values.sent,
      icon: Mail,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-500/10',
      path: '/linkedin',
    },
    {
      title: 'Total Searches',
      value: values.total,
      icon: BarChart3,
      color: 'text-violet-500',
      bgColor: 'bg-violet-50 dark:bg-violet-500/10',
      path: '/history',
    },
  ];

  const quickActions = [
    {
      title: 'LinkedIn Outreach',
      description: 'Upload CSV, draft mails, review, and send',
      icon: Linkedin,
      path: '/linkedin',
    },
    {
      title: 'YouTube Analysis',
      description: 'Analyze comments, sentiment, and transcripts',
      icon: Youtube,
      path: '/youtube',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Your analysis and outreach activity is shown from backend history endpoints.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 dark:border-primary-500/30 dark:bg-primary-500/10">
            <Zap className="h-5 w-5 text-primary-500" />
            <span className="font-medium text-primary-700 dark:text-primary-300">AI Powered</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            to={stat.path}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-950 dark:text-white">
                  {loading ? <span className="animate-pulse">...</span> : stat.value}
                </p>
              </div>
              <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-slate-500 transition-colors group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:text-white">
              <span>View details</span>
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-950 dark:text-white">
          <Zap className="h-5 w-5 text-primary-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.path}
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-500/50"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary-50 p-3 dark:bg-primary-500/10">
                  <action.icon className="h-6 w-6 text-primary-600 dark:text-primary-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
                    {action.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-950 dark:text-white">
          <Brain className="h-5 w-5 text-primary-500" />
          Platform Features
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 font-semibold text-slate-950 dark:text-white">YouTube</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sentiment analysis, comments, transcripts, and video download tools.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 font-semibold text-slate-950 dark:text-white">LinkedIn</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              CSV upload, AI draft generation, review, sending, and sent-mail history.
            </p>
          </div>
        </div>
      </section>


    </div>
  );
}
