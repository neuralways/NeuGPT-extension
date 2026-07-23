import { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  History as HistoryIcon,
  Linkedin,
  Loader2,
  Youtube,
} from 'lucide-react';
import { historyAPI } from '../services/api';
import { useAuthStore } from '../stores/useStore';

const asList = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const formatDate = (value) => {
  if (!value) return 'Unknown date';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

export default function History() {
  const { user, fetchUser, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('linkedin');
  const [loading, setLoading] = useState(true);
  const [youtubeHistory, setYoutubeHistory] = useState([]);
  const [linkedinHistory, setLinkedinHistory] = useState([]);
  const [linkedinCursor, setLinkedinCursor] = useState(null);
  const [hasMoreLinkedin, setHasMoreLinkedin] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isAuthenticated && !user) fetchUser();
  }, [fetchUser, isAuthenticated, user]);

  useEffect(() => {
    const loadHistory = async () => {
      const userEmail = user?.email;
      let userId = user?.email;

      if (!userEmail && !userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (userEmail) {
          const linkedinResponse = await historyAPI.getLinkedinHistory({
            email: userEmail,
            limit: 5,
          });
          userId = userId || linkedinResponse.data?.user_id;
          const items = asList(linkedinResponse.data, ['searches', 'history', 'items', 'data']);
          setLinkedinHistory(items);
          if (items.length === 5) {
            setHasMoreLinkedin(true);
            setLinkedinCursor(items[items.length - 1].id);
          } else {
            setHasMoreLinkedin(false);
          }
        }

        if (userId) {
          const [youtubeResponse, statsResponse] = await Promise.all([
            historyAPI.getYoutubeHistory(userId, 10),
            historyAPI.getStats(userId),
          ]);
          setYoutubeHistory(asList(youtubeResponse.data, ['searches', 'history', 'items', 'data']));
          setStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  const handleLoadMoreLinkedin = async () => {
    const userEmail = user?.email;
    if (!userEmail || !linkedinCursor) return;

    setIsLoadingMore(true);
    try {
      const response = await historyAPI.getLinkedinHistory({
        email: userEmail,
        limit: 5,
        cursor: linkedinCursor,
      });
      const items = asList(response.data, ['searches', 'history', 'items', 'data']);
      setLinkedinHistory((prev) => [...prev, ...items]);

      if (items.length === 5) {
        setHasMoreLinkedin(true);
        setLinkedinCursor(items[items.length - 1].id);
      } else {
        setHasMoreLinkedin(false);
      }
    } catch (error) {
      console.error('Failed to load more linkedin history:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const totalYoutube = stats?.youtube_searches || stats?.youtube_count || youtubeHistory.length;
  const totalLinkedin = stats?.linkedin_searches || stats?.linkedin_count || linkedinHistory.length;

  const tabs = [
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-950 dark:text-white">
          <HistoryIcon className="h-8 w-8 text-primary-500" />
          History
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          LinkedIn history is fetched from Firestore through the backend history API.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">LinkedIn analyses</p>
          <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{totalLinkedin}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">YouTube analyses</p>
          <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{totalYoutube}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
          <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">
            {stats?.total_searches || stats?.total_analyses || totalLinkedin + totalYoutube}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex gap-2 border-b border-slate-200 px-4 dark:border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-300'
                  : 'border-transparent text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {(activeTab === 'linkedin' ? linkedinHistory : youtubeHistory).map((item, index) => {
              const isLinkedin = activeTab === 'linkedin';
              const Icon = isLinkedin ? Linkedin : Youtube;
              const title = isLinkedin
                ? item.filename || item.file_name || 'LinkedIn CSV analysis'
                : item.video_title || item.title || item.video_url || 'YouTube analysis';
              const subtitle = isLinkedin
                ? `${item.summary?.total_posts ?? 0} posts, ${item.summary?.recent_mails ?? 0} mails`
                : item.video_url || item.url || 'Video analysis';

              return (
                <article
                  key={item.id || index}
                  className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10">
                      <Icon className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-950 dark:text-white">{title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.created_at || item.date)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}

            {(activeTab === 'linkedin' ? linkedinHistory : youtubeHistory).length === 0 && (
              <div className="py-14 text-center text-slate-500 dark:text-slate-400">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 opacity-50" />
                No {activeTab === 'linkedin' ? 'LinkedIn' : 'YouTube'} history found.
              </div>
            )}

            {activeTab === 'linkedin' && hasMoreLinkedin && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMoreLinkedin}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
