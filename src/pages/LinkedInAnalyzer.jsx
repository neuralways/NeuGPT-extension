import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileSpreadsheet,
  Linkedin,
  Loader2,
  Mail,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import LinkedInUploader from '../components/LinkedInUploader';
import { authAPI, linkedinAPI } from '../services/api';
import { useAuthStore, useAppStore } from '../stores/useStore';

const REQUIRED_COLUMNS = ['Author', 'Post Text', 'Post Link', 'Email', 'Date', 'Company'];
const PROCESSING_STEPS = ['Reading CSV', 'Extracting key details', 'Drafting mails'];
const EXTENSION_URL = 'https://github.com/neuralways/linkedin-post-scrapper/archive/refs/heads/master.zip';

const normalizeDrafts = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.drafts)) return payload.drafts;
  if (Array.isArray(payload?.mails)) return payload.mails;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getRecipient = (draft) =>
  draft.recipient_email ||
  draft.recipient ||
  draft.to ||
  draft.email ||
  draft.recipients?.join?.(', ') ||
  'Recipient not found';

const getBody = (draft) => draft.body || draft.content || draft.message || '';

const getSentDate = (draft) => {
  const rawDate = draft.sent_at || draft.sentAt || draft.updated_at || draft.created_at;
  if (!rawDate) return 'Recently sent';
  const date = typeof rawDate === 'number' ? new Date(rawDate * 1000) : new Date(rawDate);
  return Number.isNaN(date.getTime()) ? String(rawDate) : date.toLocaleDateString();
};

const draftsCache = {
  pendingDrafts: null,
  sentDrafts: null,
  sentCursor: null,
  hasMoreSent: true,
  lastFetch: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCompanyDisplay = (post) => {
  if (post.Company && typeof post.Company === 'string' && post.Company.trim() !== '' && post.Company.toLowerCase() !== 'unknown') {
    return post.Company;
  }
  if (post.Email && typeof post.Email === 'string' && post.Email.includes('@')) {
    const domain = post.Email.split('@')[1];
    const company = domain.split('.')[0];
    return company.charAt(0).toUpperCase() + company.slice(1);
  }
  return 'Unknown Company';
};

const getRoleDisplay = (post) => {
  const role = post.Role || post.role;
  if (role && typeof role === 'string' && role.trim() !== '' && role.toLowerCase() !== 'unknown') {
    return role;
  }
  if (post.Author && typeof post.Author === 'string' && post.Author.trim() !== '' && post.Author.toLowerCase() !== 'unknown') {
    return 'Post by ' + post.Author;
  }
  return 'General Application';
};

const normalizeKeyPart = (value) => String(value || '').trim().toLowerCase();

const getPostIdentityKey = (post) => {
  const role = normalizeKeyPart(post.Role || post.role);
  const postLink = normalizeKeyPart(post['Post Link'] || post.post_link);

  if (postLink && postLink !== 'n/a') {
    return `link:${postLink}||role:${role}`;
  }

  return [
    `email:${normalizeKeyPart(post.Email || post.email)}`,
    `author:${normalizeKeyPart(post.Author || post.author)}`,
    `date:${normalizeKeyPart(post.Date || post.date)}`,
    `text:${normalizeKeyPart(post['Post Text'] || post.post_text)}`,
    `role:${role}`,
  ].join('||');
};

const getDraftSendStatus = (draft) => {
  const status = draft.send_status || (draft.sent ? 'sent' : 'pending');
  const statuses = {
    pending: { label: 'Ready to send', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    sending: { label: 'Sending - do not retry', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    sent: { label: 'Accepted by Gmail', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    failed: { label: 'Not sent - retry available', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    unknown: { label: 'Needs confirmation - not retried', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  };
  return statuses[status] || statuses.pending;
};

const createCsvFileFromPosts = (posts, fileName = 'scraped_jobs.csv') => {
  const headers = ['Author', 'Post Text', 'Post Link', 'Email', 'Date', 'Company', 'Role'];
  const csvRows = [headers.join(',')];

  for (const row of posts) {
    const values = headers.map(header => {
      const value = row[header] ? String(row[header]).replace(/"/g, '""') : '';
      return `"${value}"`;
    });
    csvRows.push(values.join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return new File([blob], fileName, { type: 'text/csv' });
};

const normalizePreviewData = (payload) => ({
  ...payload,
  eligible_mails: Array.isArray(payload?.eligible_mails) ? payload.eligible_mails : [],
  excluded_posts: Array.isArray(payload?.excluded_posts) ? payload.excluded_posts : [],
});

export default function LinkedInAnalyzer() {
  const [scrapedData, setScrapedData] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [sentDrafts, setSentDrafts] = useState([]);
  const [expandedDrafts, setExpandedDrafts] = useState(new Set([0]));
  const [includeResume, setIncludeResume] = useState(true);
  const [resumeInfo, setResumeInfo] = useState(null);
  const [loadingAction, setLoadingAction] = useState('');
  const [processingStep, setProcessingStep] = useState(-1);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [draftStats, setDraftStats] = useState(null);
  const [role, setRole] = useState('');
  const [experienceRange, setExperienceRange] = useState('All');
  const [previewData, setPreviewData] = useState(null);
  const [excludedPreviewPostKeys, setExcludedPreviewPostKeys] = useState([]);
  const [activePreviewTab, setActivePreviewTab] = useState('relevant');
  const [scrollSpeed, setScrollSpeed] = useState(5);
  const [liveCount, setLiveCount] = useState(0);
  
  const { user } = useAuthStore();
  const { globalStats, fetchGlobalStats } = useAppStore();
  
  const [sentCursor, setSentCursor] = useState(null);
  const [hasMoreSent, setHasMoreSent] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(null);
  
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sentByDate = useMemo(() => {
    return sentDrafts.reduce((groups, draft) => {
      const date = getSentDate(draft);
      groups[date] = [...(groups[date] || []), draft];
      return groups;
    }, {});
  }, [sentDrafts]);

  useEffect(() => {
    fetchDrafts(false);
    fetchDrafts(true);
    fetchResume();
    if (user && !globalStats) {
      fetchGlobalStats(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (!window.chrome || !window.chrome.runtime) return;
    const messageListener = (request, sender, sendResponse) => {
      if (request.action === 'updateCount') {
        setLiveCount(request.count);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  useEffect(() => {
    if (loadingAction !== 'draft') {
      setProcessingStep(-1);
      return undefined;
    }

    setProcessingStep(0);
    const intervalId = setInterval(() => {
      setProcessingStep((current) => Math.min(current + 1, PROCESSING_STEPS.length - 1));
    }, 1200);

    return () => clearInterval(intervalId);
  }, [loadingAction]);

  const showError = (err, fallback) => {
    setError(err.response?.data?.detail || err.message || fallback);
  };

  const fetchDrafts = async (sent, force = false, loadMore = false) => {
    const now = Date.now();
    
    // Use cache if valid and not forcing a refresh
    if (!force && !loadMore && (now - draftsCache.lastFetch < CACHE_TTL)) {
      if (sent && draftsCache.sentDrafts) {
        setSentDrafts(draftsCache.sentDrafts);
        setSentCursor(draftsCache.sentCursor);
        setHasMoreSent(draftsCache.hasMoreSent);
        return;
      }
      if (!sent && draftsCache.pendingDrafts) {
        setDrafts(draftsCache.pendingDrafts);
        return;
      }
    }

    try {
      const cursor = loadMore ? sentCursor : null;
      const response = await linkedinAPI.getDrafts({ sent, limit: sent ? 20 : 50, cursor });
      const nextDrafts = normalizeDrafts(response.data);
      
      if (sent) {
        if (loadMore) {
          setSentDrafts((prev) => {
            const combined = [...prev, ...nextDrafts];
            draftsCache.sentDrafts = combined;
            return combined;
          });
        } else {
          setSentDrafts(nextDrafts);
          draftsCache.sentDrafts = nextDrafts;
        }
        
        const newCursor = nextDrafts.length > 0 ? nextDrafts[nextDrafts.length - 1].id : null;
        const moreAvailable = nextDrafts.length === 20;
        
        setSentCursor(newCursor);
        setHasMoreSent(moreAvailable);
        
        draftsCache.sentCursor = newCursor;
        draftsCache.hasMoreSent = moreAvailable;
      } else {
        setDrafts(nextDrafts);
        draftsCache.pendingDrafts = nextDrafts;
      }
      
      draftsCache.lastFetch = now;
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    }
  };

  const handleLoadMoreSent = async () => {
    setIsLoadingMore(true);
    await fetchDrafts(true, false, true);
    setIsLoadingMore(false);
  };

  const fetchResume = async () => {
    try {
      const response = await authAPI.getResume();
      setResumeInfo(response.data?.has_resume ? response.data : null);
    } catch (err) {
      console.error('Failed to fetch resume metadata:', err);
      setResumeInfo(null);
    }
  };

  const generateLinkedInSearchUrl = (searchRole) => {
    const encodedRole = encodeURIComponent(searchRole.trim());
    return `https://www.linkedin.com/search/results/content/?keywords=${encodedRole}&origin=FACETED_SEARCH&datePosted=%5B%22past-24h%22%5D`;
  };

  const handleOpenLinkedInSearch = () => {
    if (!role.trim()) {
      setError('Please enter a role to search for.');
      return;
    }
    const url = generateLinkedInSearchUrl(role);
    window.open(url, '_blank');
  };

  const [isScraping, setIsScraping] = useState(false);

  const handleStartScraping = async () => {
    setError('');
    setSuccessMessage('');
    try {
      if (!window.chrome || !window.chrome.tabs) {
        setError('Chrome extension API not available.');
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.url.includes('linkedin.com')) {
          setError('Please navigate to LinkedIn to scrape jobs.');
          return;
        }
        chrome.tabs.sendMessage(activeTab.id, { action: 'resetData' }, () => {
          if (chrome.runtime.lastError) {
            setError('Could not connect to LinkedIn page. Please refresh the page and try again.');
            return;
          }
          chrome.tabs.sendMessage(activeTab.id, { action: 'startScraping', speed: scrollSpeed }, () => {
            if (chrome.runtime.lastError) {
              setError('Could not start scraping. Please refresh the LinkedIn page and try again.');
              return;
            }
            setIsScraping(true);
            setLiveCount(0);
            setSuccessMessage('Scraping started! Scroll will run automatically.');
          });
        });
      });
    } catch(e) {
      setError('Scraping error: ' + e.message);
    }
  };

  const handleStopScraping = async () => {
    setLoadingAction('scrape');
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab) return;
        
        chrome.tabs.sendMessage(activeTab.id, { action: 'stopScraping' }, () => {
            chrome.tabs.sendMessage(activeTab.id, { action: 'getScrapedData' }, (response) => {
              console.log('[LinkedInAnalyzer] getScrapedData response:', response);
              setIsScraping(false);
              if (response && response.success && response.data && response.data.length > 0) {
                console.log('[LinkedInAnalyzer] Received', response.data.length, 'posts from content script');
                // Attach the current role to each newly scraped post so it can be identified later
                const newPostsWithRole = response.data.map(p => ({
                  ...p,
                  Role: role.trim(),
                }));

                setScrapedData(prev => {
                  const existing = prev || [];
                  const existingKeys = new Set(existing.map(getPostIdentityKey));
                  const newPosts = newPostsWithRole.filter(p => {
                    const key = getPostIdentityKey(p);
                    if (existingKeys.has(key)) return false;
                    existingKeys.add(key);
                    return true;
                  });
                  console.log('[LinkedInAnalyzer] New unique posts to add:', newPosts.length);
                  const combined = [...existing, ...newPosts];
                  setSuccessMessage(`Added ${newPosts.length} new posts with emails (Total: ${combined.length})!`);
                  return combined;
                });
                setPreviewData(null);
                setDrafts([]);
                chrome.tabs.sendMessage(activeTab.id, { action: 'resetData' }, () => {});
              } else {
                console.warn('[LinkedInAnalyzer] No posts returned or error');
                setError('No posts with email addresses found. Make sure the posts are visible and contain email addresses.');
                setLiveCount(0);
              }
              setLoadingAction('');
            });
          });
      });
    } catch(e) {
      setError('Error stopping scrape: ' + e.message);
      setLoadingAction('');
    }
  };

  const handlePreviewJobs = async () => {
    if (!scrapedData || scrapedData.length === 0) {
      setError('Please scrape jobs first.');
      return;
    }

    setLoadingAction('preview');
    setError('');
    setSuccessMessage('');
    setPreviewData(null);
    setExcludedPreviewPostKeys([]);

    try {
      const fileObj = createCsvFileFromPosts(scrapedData);

      await linkedinAPI.analyzePosts(fileObj);
      const response = await linkedinAPI.previewDrafts({ experience_range: experienceRange });
      const nextPreviewData = normalizePreviewData(response.data);

      setPreviewData(nextPreviewData);
      setSuccessMessage(
        `Preview generated successfully. Relevant: ${nextPreviewData.eligible_mails.length} | Excluded: ${nextPreviewData.excluded_posts.length}.`
      );
    } catch (err) {
      showError(err, 'Failed to preview jobs');
    } finally {
      setLoadingAction('');
    }
  };

  const handleRemovePreviewPost = (post) => {
    const key = getPostIdentityKey(post);
    setExcludedPreviewPostKeys((current) => current.includes(key) ? current : [...current, key]);
    setPreviewData((current) => {
      if (!current) return current;
      return {
        ...current,
        eligible_mails: current.eligible_mails.filter((item) => getPostIdentityKey(item) !== key),
        excluded_posts: [
          ...current.excluded_posts,
          { ...post, excluded_reason: 'Removed by you from the preview.' },
        ],
      };
    });
  };

  const handleDownloadCSV = () => {
    if (!scrapedData || scrapedData.length === 0) return;
    const headers = ['Author', 'Post Text', 'Post Link', 'Email', 'Date', 'Company', 'Role'];
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of scrapedData) {
      const values = headers.map(header => {
        const val = row[header] ? String(row[header]).replace(/"/g, '""') : '';
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `linkedin_scraped_posts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDraftMails = async () => {
    if (!scrapedData) {
      setError('Please scrape jobs first.');
      return;
    }

    if (!previewData) {
      setError('Please preview the jobs first.');
      return;
    }

    setLoadingAction('draft');
    setError('');
    setSuccessMessage('');

    try {
      const response = await linkedinAPI.generateDrafts({
        experience_range: experienceRange,
        excluded_post_keys: excludedPreviewPostKeys,
      });
      await fetchDrafts(false, true); // force refresh pending drafts
      
      const info = response.data?.filter_info;
      const generated = response.data?.drafts_generated || 0;
      const skipped = info ? info.total_posts - generated : 0;
      
      setDraftStats({ generated, skipped });
      setPreviewData(null);
      setExcludedPreviewPostKeys([]);
      setSuccessMessage(`Drafted mails are ready. Generated: ${generated} | Skipped: ${skipped}. Review them before sending.`);
    } catch (err) {
      showError(err, 'Failed to analyze CSV and draft mails');
    } finally {
      setLoadingAction('');
    }
  };

  const handleSendDrafts = async () => {
    setLoadingAction('send');
    const initialCount = drafts.length;
    const sentBefore = sentDrafts.length;
    setSendingProgress({ total: initialCount, sent: 0, remaining: initialCount });
    
    // Poll backend every 2 seconds for remaining pending drafts
    const intervalId = setInterval(async () => {
      try {
        const response = await linkedinAPI.getDrafts({ limit: 1000 });
        const currentDrafts = response.data?.drafts || [];
        const sentCount = currentDrafts.filter((draft) => draft.sent || draft.send_status === 'sent').length;
        const remaining = currentDrafts.filter((draft) => !draft.sent && draft.send_status !== 'sent').length;
        setSendingProgress(prev => {
          if (!prev) return prev;
          const sent = Math.min(initialCount, Math.max(0, sentCount - sentBefore));
          return { ...prev, sent, remaining };
        });
      } catch (err) {
        // ignore polling errors
      }
    }, 2000);

    try {
      const response = await linkedinAPI.sendDrafts(includeResume);
      draftsCache.pendingDrafts = null;
      draftsCache.sentDrafts = null;
      await Promise.all([fetchDrafts(false, true), fetchDrafts(true, true)]);
      setSuccessMessage(response.data?.message || `Gmail accepted ${response.data?.drafts_sent || 0} email(s).`);
    } catch (err) {
      showError(err, 'Failed to send mails');
    } finally {
      clearInterval(intervalId);
      setSendingProgress(null);
      setLoadingAction('');
      if (user) fetchGlobalStats(user.email);
    }
  };

  const handleEditClick = (draft) => {
    setEditingDraftId(draft.id);
    setEditSubject(draft.subject || '');
    setEditBody(getBody(draft));
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    try {
      await linkedinAPI.deleteDraft(draftId);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      if (draftsCache.pendingDrafts) {
        draftsCache.pendingDrafts = draftsCache.pendingDrafts.filter(d => d.id !== draftId);
      }
      setSuccessMessage('Draft deleted successfully.');
    } catch (err) {
      showError(err, 'Failed to delete draft');
    }
  };

  const handleCancelEdit = () => {
    setEditingDraftId(null);
  };

  const handleSaveDraft = async (draftId) => {
    setIsSaving(true);
    try {
      await linkedinAPI.updateDraft(draftId, { subject: editSubject, body: editBody });
      setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, subject: editSubject, body: editBody } : d));
      if (draftsCache.pendingDrafts) {
        draftsCache.pendingDrafts = draftsCache.pendingDrafts.map(d => d.id === draftId ? { ...d, subject: editSubject, body: editBody } : d);
      }
      setEditingDraftId(null);
      setSuccessMessage('Draft updated successfully.');
    } catch (err) {
      showError(err, 'Failed to update draft');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDraft = (index) => {
    setExpandedDrafts((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2a394b] dark:bg-[#121e2c]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-[#e1e7ef] bg-[#f7f8fa] p-4 dark:border-[#34465c] dark:bg-[#1a293c]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#183b67] dark:text-[#b9d8f6]">
              <Linkedin className="h-4 w-4" aria-hidden="true" />
              Quick LinkedIn Search
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Enter job role (e.g., Software Engineer Intern)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#52769a] focus:outline-none focus:ring-2 focus:ring-[#52769a]/20 dark:border-[#40536a] dark:bg-[#0c1522] dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                onClick={handleOpenLinkedInSearch}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <ExternalLink className="h-4 w-4" />
                Open LinkedIn Search
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 bg-[#f7f8fa] p-4 dark:border-[#2a394b] dark:bg-[#0f1a29]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#183b67]">
                <Linkedin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-[#172338] dark:text-white">LinkedIn outreach</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Collect hiring posts and prepare recruiter drafts
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!isScraping && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Speed:</span>
                  <select
                    value={scrollSpeed}
                    onChange={(e) => setScrollSpeed(Number(e.target.value))}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value={1}>1 (Slow)</option>
                    <option value={5}>5 (Normal)</option>
                    <option value={10}>10 (Fast)</option>
                    <option value={20}>20 (Very Fast)</option>
                  </select>
                </div>
              )}

              {isScraping ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                    </span>
                    {liveCount} Collected
                  </span>
                  <button
                    onClick={handleStopScraping}
                    disabled={loadingAction === 'scrape'}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingAction === 'scrape' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Stop & Fetch Data
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartScraping}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-green-600/20 transition hover:bg-green-700"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Start Scraping
                </button>
              )}

              <select
                value={experienceRange}
                onChange={(e) => setExperienceRange(e.target.value)}
                disabled={!scrapedData || Boolean(loadingAction)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
              >
                <option value="All">All Experience</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-8">5-8 years</option>
                <option value="8+">8+ years</option>
                <option value="below 5">Below 5 years</option>
                <option value="below 10">Below 10 years</option>
              </select>

              <button
                onClick={handlePreviewJobs}
                disabled={!scrapedData || Boolean(loadingAction)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === 'preview' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Preview Jobs
              </button>
              
              {scrapedData && scrapedData.length > 0 && (
                <>
                  <button
                    onClick={handleDownloadCSV}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download CSV
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to discard all collected data?')) {
                        setScrapedData(null);
                        setPreviewData(null);
                        setDrafts([]);
                        setSuccessMessage('Data discarded.');
                        if (window.chrome && window.chrome.tabs) {
                          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            const activeTab = tabs[0];
                            if (activeTab) chrome.tabs.sendMessage(activeTab.id, { action: 'resetData' });
                          });
                        }
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 dark:border-red-900/30 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Discard Data
                  </button>
                </>
              )}
            </div>
          </div>
          
          {previewData && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Job Relevance Preview</h3>
                <button
                  onClick={handleDraftMails}
                  disabled={loadingAction === 'draft' || !previewData.eligible_mails?.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingAction === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Draft {previewData.eligible_mails?.length || 0} Relevant Mails (Uses Quota)
                </button>
              </div>
              
              <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                <button
                  onClick={() => setActivePreviewTab('relevant')}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${activePreviewTab === 'relevant' ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                >
                  Relevant Jobs ({previewData.eligible_mails?.length || 0})
                </button>
                <button
                  onClick={() => setActivePreviewTab('excluded')}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${activePreviewTab === 'excluded' ? 'border-b-2 border-red-600 text-red-600 dark:border-red-500 dark:text-red-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                >
                  Excluded Jobs ({previewData.excluded_posts?.length || 0})
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {activePreviewTab === 'relevant' && (
                   previewData.eligible_mails?.length === 0 ? <p className="text-slate-500 text-sm py-4">No relevant jobs found for this criteria.</p> :
                   previewData.eligible_mails.map((post, i) => (
                     <div key={getPostIdentityKey(post) || i} className="flex items-start justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-900/50 dark:border-slate-700">
                       <div className="min-w-0">
                         <p className="font-medium text-slate-900 dark:text-white text-sm">{getRoleDisplay(post)}</p>
                         <p className="text-xs text-slate-500">{getCompanyDisplay(post)} • {post.Email}</p>
                       </div>
                       <button
                         type="button"
                         onClick={() => handleRemovePreviewPost(post)}
                         className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-500/10"
                         aria-label={`Delete ${getRoleDisplay(post)} from job preview`}
                       >
                         <Trash2 className="h-3.5 w-3.5" />
                         Delete job
                       </button>
                     </div>
                   ))
                )}
                {activePreviewTab === 'excluded' && (
                   previewData.excluded_posts?.length === 0 ? <p className="text-slate-500 text-sm py-4">No excluded jobs.</p> :
                   previewData.excluded_posts.map((post, i) => (
                     <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-900/30">
                       <p className="font-medium text-slate-900 dark:text-white text-sm">{getRoleDisplay(post)}</p>
                       <p className="text-xs text-slate-500">{getCompanyDisplay(post)} • {post.Email}</p>
                       <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1 break-words whitespace-pre-wrap">{post.excluded_reason}</p>
                     </div>
                   ))
                )}
              </div>
            </div>
          )}

          {globalStats && globalStats.daily_limit > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Daily Mail Quota ({globalStats.daily_sent} / {globalStats.daily_limit})</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full ${globalStats.daily_sent >= globalStats.daily_limit ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min((globalStats.daily_sent / globalStats.daily_limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                      <Linkedin className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white text-center">Scrape LinkedIn Jobs</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
                      Navigate to LinkedIn Jobs or Feed and click the button below to automatically extract job posts and emails.
                    </p>
                    <button
                      onClick={handleStartScraping}
                      disabled={isScraping}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isScraping ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                      {isScraping ? 'Scraping Page...' : 'Scrape Current Page'}
                    </button>
                    {scrapedData && (
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
                        ✓ {scrapedData.length} posts scraped and ready for preview.
                      </p>
                    )}
                  </div>
                </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
                <FileSpreadsheet className="h-4 w-4" />
                Required CSV columns
              </div>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_COLUMNS.map((column) => (
                  <span
                    key={column}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-900 dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-200"
                  >
                    {column}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Flow</h2>
            <div className="mt-4 space-y-3">
              {PROCESSING_STEPS.map((step, index) => {
                const active = loadingAction === 'draft' && processingStep === index;
                const done = drafts.length > 0 || (loadingAction === 'draft' && processingStep > index);
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done
                          ? 'bg-green-500 text-white'
                          : active
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{step}</span>
                    {active && <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          <span className="flex-1 text-sm font-medium">{error}</span>
          <button onClick={() => setError('')} className="rounded-lg px-3 py-1 text-sm hover:bg-red-100 dark:hover:bg-red-500/10">
            Dismiss
          </button>
        </div>
      )}

      {drafts.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Review Drafted Emails</h2>
              {draftStats && (
                <div className="mt-2 mb-1 flex items-center gap-3 text-sm">
                  <span className="rounded bg-blue-100 px-2.5 py-1 text-blue-800 font-medium dark:bg-blue-900/40 dark:text-blue-300">
                    Generated: {draftStats.generated}
                  </span>
                  <span className="rounded bg-slate-100 px-2.5 py-1 text-slate-700 font-medium dark:bg-slate-800 dark:text-slate-300">
                    Skipped: {draftStats.skipped}
                  </span>
                </div>
              )}
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Open each mail before sending. Sent means Gmail accepted it, not confirmed inbox delivery.</p>
            </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeResume}
                      onChange={(event) => setIncludeResume(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Send with uploaded resume
                  </label>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {resumeInfo ? resumeInfo.file_name : 'No resume uploaded'}
                  </span>
                  <button
                    onClick={handleSendDrafts}
                    disabled={loadingAction === 'send'}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {loadingAction === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Mails
                  </button>
                </div>
                {sendingProgress && (
                  <div className="w-full max-w-sm rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      <span>Sending Mails...</span>
                      <span>{Math.round((sendingProgress.sent / sendingProgress.total) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/50">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${Math.min((sendingProgress.sent / sendingProgress.total) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-medium opacity-80">
                      <span>Sent: {sendingProgress.sent}</span>
                      <span>Remaining: {sendingProgress.remaining}</span>
                      <span>Total: {sendingProgress.total}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          <div className="space-y-3">
            {drafts.map((draft, index) => {
              const isExpanded = expandedDrafts.has(index);
              const sendStatus = getDraftSendStatus(draft);
              const isSendLocked = ['sending', 'unknown', 'sent'].includes(draft.send_status || (draft.sent ? 'sent' : 'pending'));
              return (
                <article key={draft.id || index} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => toggleDraft(index)}
                    className="flex w-full items-center justify-between gap-4 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-900/70"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/10">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950 dark:text-white">{draft.subject || `Draft ${index + 1}`}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">To: {getRecipient(draft)}</p>
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${sendStatus.className}`}>{sendStatus.label}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 p-4">
                      {editingDraftId === draft.id ? (
                        <>
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Subject</p>
                            <input
                              type="text"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Message</p>
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              className="min-h-[220px] w-full resize-y rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveDraft(draft.id)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Save Changes
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold uppercase text-slate-500">Subject</p>
                              {!isSendLocked && (
                                <>
                                  <button
                                    onClick={() => handleEditClick(draft)}
                                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit Draft
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDraft(draft.id)}
                                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                              {draft.subject || 'No subject'}
                            </div>
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Message</p>
                            <textarea
                              readOnly
                              value={getBody(draft)}
                              className="min-h-[220px] w-full resize-y rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                            />
                          </div>
                          {draft.send_error && (
                            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                              Send status details: {draft.send_error}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Last Sent Mails</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gmail acceptance history; this does not confirm inbox delivery.</p>
          </div>
        </div>

        {Object.keys(sentByDate).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(sentByDate).map(([date, mails]) => (
              <div key={date} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-3 text-sm font-semibold text-slate-950 dark:text-white">{date}</p>
                <div className="space-y-2">
                  {mails.map((mail, index) => (
                    <div key={mail.id || index} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{mail.subject || `Sent mail ${index + 1}`}</p>
                        <p className="truncate text-xs text-slate-500">To: {getRecipient(mail)} - Accepted by Gmail</p>
                        {mail.message_id && <p className="truncate text-[11px] text-slate-400">Message ID: {mail.message_id}</p>}
                      </div>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {hasMoreSent && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMoreSent}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load More History
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
            <Mail className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sent mails will appear here after you send drafted mails.</p>
          </div>
        )}
      </section>
    </div>
  );
}
