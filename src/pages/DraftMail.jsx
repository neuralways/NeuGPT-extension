import { useState, useEffect } from 'react';
import { draftMailAPI, linkedinAPI } from '../services/api';
import { useAuthStore } from '../stores/useStore';
import {
  Mail,
  Send,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Briefcase,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Filter,
  Eye,
} from 'lucide-react';

export default function DraftMail() {
  const { gmailConnected, checkGmailStatus, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [editingDraft, setEditingDraft] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [expandedDraft, setExpandedDraft] = useState(null);
  
  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    daily_limit: 0,
    daily_sent: 0,
  });
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  
  // Send result
  const [sendResult, setSendResult] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    recipients: '',
    roles: [],
  });
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    skip_domain_filter: false,
    skip_experience_filter: false,
    skip_location_filter: false,
  });
  
  // Send options
  const [sendOptions, setSendOptions] = useState({
    force_send_cooldown: false,
    include_resume: false,
  });

  useEffect(() => {
    checkGmailStatus();
    fetchProfile();
    fetchDraftsAndStats();
    
    const handleOnline = () => {
      fetchDraftsAndStats();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [checkGmailStatus, fetchProfile]);

  // Get profile roles for selection
  const profileRoles = profile?.interested_roles || [];

  const fetchDraftsAndStats = async () => {
    try {
      // Get latest analysis ID first
      const draftsResponse = await draftMailAPI.getDrafts();
      const draftsData = draftsResponse.data.drafts || draftsResponse.data || [];
      setDrafts(draftsData);
      
      // Extract analysis_id from drafts if available
      if (draftsData.length > 0 && draftsData[0].analysis_id) {
        const analysisId = draftsData[0].analysis_id;
        setCurrentAnalysisId(analysisId);
        
        // Fetch stats for this analysis
        try {
          const statsResponse = await draftMailAPI.getDraftStats(analysisId);
          setStats({
            ...statsResponse.data,
            daily_limit: draftsResponse.data?.daily_limit || 0,
            daily_sent: draftsResponse.data?.daily_sent || 0,
          });
        } catch (err) {
          console.error('Failed to fetch stats:', err);
          // Calculate stats from drafts
          const sent = draftsData.filter(d => d.sent).length;
          const pending = draftsData.filter(d => !d.sent).length;
          setStats({
            total: draftsData.length,
            sent,
            pending,
            skipped: 0,
            failed: 0,
            daily_limit: draftsResponse.data?.daily_limit || 0,
            daily_sent: draftsResponse.data?.daily_sent || 0,
          });
        }
      } else {
        // Calculate stats from local drafts
        const sent = draftsData.filter(d => d.sent).length;
        setStats({
          total: draftsData.length,
          sent,
          pending: draftsData.length - sent,
          skipped: 0,
          failed: 0,
          daily_limit: draftsResponse.data?.daily_limit || 0,
          daily_sent: draftsResponse.data?.daily_sent || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    }
  };

  const handleGenerateDrafts = async () => {
    if (!formData.subject.trim() || !formData.body.trim()) {
      alert('Please fill in both subject and body');
      return;
    }

    setLoading(true);

    try {
      const response = await draftMailAPI.generateDrafts({
        subject: formData.subject,
        body: formData.body,
        recipients: formData.recipients.split(',').map((r) => r.trim()).filter(Boolean),
        roles: formData.roles.length > 0 ? formData.roles : undefined,
      });
      await fetchDraftsAndStats();
      setShowForm(false);
      setFormData({ subject: '', body: '', recipients: '', roles: [] });
    } catch (error) {
      console.error('Failed to generate drafts:', error);
      alert('Failed to generate drafts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLatestDrafts = async () => {
    setLoading(true);

    try {
      const response = await draftMailAPI.createLatestDrafts({
        ...filterOptions,
        roles: formData.roles.length > 0 ? formData.roles : undefined,
      });
      await fetchDraftsAndStats();
    } catch (error) {
      console.error('Failed to create drafts:', error);
      alert('Failed to create drafts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAll = async () => {
    if (!gmailConnected) {
      alert('Please connect your Gmail account first');
      return;
    }
    if (!navigator.onLine) {
      alert('You are currently offline. Please check your network connection.');
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const response = await draftMailAPI.sendStoredDrafts({
        ...sendOptions,
      });
      setSendResult(response.data);
      
      // Refresh drafts and stats after sending
      await fetchDraftsAndStats();
      
      // Show success message with details
      const { drafts_sent, drafts_failed, message } = response.data;
      alert(`${message}\n\nSent: ${drafts_sent}\nFailed: ${drafts_failed}`);
    } catch (error) {
      console.error('Failed to send drafts:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to send drafts. Please try again.';
      alert(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteDraft = async (draft) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      await linkedinAPI.deleteDraft(draft.id);
      // Remove from local state
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        pending: !draft.sent && prev.pending > 0 ? prev.pending - 1 : prev.pending,
        sent: draft.sent && prev.sent > 0 ? prev.sent - 1 : prev.sent,
      }));
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

  const handleEditDraft = (draft) => {
    setEditingDraft(draft);
    setFormData({
      subject: draft.subject || '',
      body: draft.body || '',
      recipients: draft.recipient_email || draft.to || '',
      roles: draft.roles || [],
    });
    setShowForm(true);
  };

  const handleUpdateDraft = async () => {
    if (!editingDraft) return;
    
    setLoading(true);
    
    try {
      await draftMailAPI.updateDraft(editingDraft.id, {
        subject: formData.subject,
        body: formData.body,
      });
      
      // Update local state
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === editingDraft.id
            ? { ...d, subject: formData.subject, body: formData.body }
            : d
        )
      );
      
      setEditingDraft(null);
      setShowForm(false);
      setFormData({ subject: '', body: '', recipients: '', roles: [] });
    } catch (error) {
      console.error('Failed to update draft:', error);
      alert('Failed to update draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandDraft = (draftId) => {
    setExpandedDraft(expandedDraft === draftId ? null : draftId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary-500" />
            Draft Mail
          </h1>
          <p className="text-slate-400 mt-1">
            Generate and send email drafts with AI assistance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!gmailConnected && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-yellow-400">Gmail not connected</span>
            </div>
          )}
          {gmailConnected && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-400">Gmail connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Sent</p>
              <p className="text-2xl font-bold text-green-400">{stats.sent}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Skipped</p>
              <p className="text-2xl font-bold text-orange-400">{stats.skipped}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Filter className="w-5 h-5 text-orange-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Quota Progress */}
      {(stats.daily_limit > 0) && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-400" />
              Daily Mail Quota
            </h3>
            <span className="text-sm font-semibold text-slate-300">
              {stats.daily_sent} / {stats.daily_limit} Sent
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
            <div 
              className={`h-3 rounded-full ${stats.daily_sent >= stats.daily_limit ? 'bg-red-500' : 'bg-primary-500'}`} 
              style={{ width: `${Math.min((stats.daily_sent / stats.daily_limit) * 100, 100)}%` }}
            ></div>
          </div>
          {stats.daily_sent >= stats.daily_limit && (
            <p className="text-xs text-red-400">
              You have reached your daily limit. You cannot send more emails today.
            </p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            setShowForm(true);
            setEditingDraft(null);
            setFormData({ subject: '', body: '', recipients: '', roles: [] });
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 hover:border-slate-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          New Draft
        </button>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 hover:border-slate-600 transition-all"
        >
          <Filter className="w-5 h-5" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        <button
          onClick={handleCreateLatestDrafts}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
          Create Latest Drafts
        </button>
        
        <button
          onClick={() => setShowSendOptions(!showSendOptions)}
          disabled={sending || stats.pending === 0}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          Send ({stats.pending})
          {showSendOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter Options Panel */}
      {showFilters && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Generation Filters
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Enable these options to generate more email drafts by skipping certain filters
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={filterOptions.skip_domain_filter}
                onChange={(e) => setFilterOptions({ ...filterOptions, skip_domain_filter: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <p className="text-white font-medium">Skip Domain Filter</p>
                <p className="text-xs text-slate-400">Include all email domains</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={filterOptions.skip_experience_filter}
                onChange={(e) => setFilterOptions({ ...filterOptions, skip_experience_filter: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <p className="text-white font-medium">Skip Experience Filter</p>
                <p className="text-xs text-slate-400">Include all experience levels</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={filterOptions.skip_location_filter}
                onChange={(e) => setFilterOptions({ ...filterOptions, skip_location_filter: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <p className="text-white font-medium">Skip Location Filter</p>
                <p className="text-xs text-slate-400">Include all locations</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Send Options Panel */}
      {showSendOptions && (
        <div className="bg-slate-800 rounded-xl p-6 border border-green-500/30">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-400" />
            Send Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={sendOptions.force_send_cooldown}
                onChange={(e) => setSendOptions({ ...sendOptions, force_send_cooldown: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500"
              />
              <div>
                <p className="text-white font-medium">Force Send (Ignore Cooldown)</p>
                <p className="text-xs text-slate-400">Send to recipients even if recently emailed</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={sendOptions.include_resume}
                onChange={(e) => setSendOptions({ ...sendOptions, include_resume: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500"
              />
              <div>
                <p className="text-white font-medium">Include Resume</p>
                <p className="text-xs text-slate-400">Attach your resume to each email</p>
              </div>
            </label>
          </div>
          
          <button
            onClick={handleSendAll}
            disabled={sending || stats.pending === 0 || !gmailConnected}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {sending ? 'Sending...' : `Send All ${stats.pending} Pending Drafts`}
          </button>
        </div>
      )}

      {/* Draft Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingDraft ? 'Edit Draft' : 'Create New Draft'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingDraft(null);
                  setFormData({ subject: '', body: '', recipients: '', roles: [] });
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Email subject..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Body
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Email body content..."
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Recipients (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.recipients}
                  onChange={(e) =>
                    setFormData({ ...formData, recipients: e.target.value })
                  }
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Role Selection from Profile */}
              {profileRoles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Target Roles (from your profile)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {profileRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            roles: prev.roles.includes(role)
                              ? prev.roles.filter((r) => r !== role)
                              : [...prev.roles, role],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          formData.roles.includes(role)
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Selected: {formData.roles.length > 0 ? formData.roles.join(', ') : 'None'}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={editingDraft ? handleUpdateDraft : handleGenerateDrafts}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  {editingDraft ? 'Update Draft' : 'Generate Drafts'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingDraft(null);
                    setFormData({ subject: '', body: '', recipients: '', roles: [] });
                  }}
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Result */}
      {sendResult && (
        <div className={`rounded-xl p-4 border ${
          sendResult.drafts_failed === 0 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-start gap-3">
            {sendResult.drafts_failed === 0 ? (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-white font-medium">{sendResult.message}</p>
              <div className="mt-2 text-sm text-slate-300">
                <p>Sent: {sendResult.drafts_sent}</p>
                <p>Failed: {sendResult.drafts_failed}</p>
                {sendResult.drafts_skipped_due_to_daily_limit > 0 && (
                  <p>Skipped (daily limit): {sendResult.drafts_skipped_due_to_daily_limit}</p>
                )}
              </div>
              {sendResult.failed_drafts && sendResult.failed_drafts.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-slate-400 mb-2">Failed recipients:</p>
                  <ul className="text-sm text-red-300 space-y-1">
                    {sendResult.failed_drafts.slice(0, 5).map((failed, idx) => (
                      <li key={idx}>• {failed.recipient}: {failed.error}</li>
                    ))}
                    {sendResult.failed_drafts.length > 5 && (
                      <li>... and {sendResult.failed_drafts.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => setSendResult(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drafts List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Your Drafts ({drafts.length})
        </h3>

        {drafts.length > 0 ? (
          <div className="space-y-3">
            {drafts.map((draft, index) => (
              <div
                key={draft.id || index}
                className={`bg-slate-800 rounded-xl border overflow-hidden transition-colors ${
                  draft.sent 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          draft.sent 
                            ? 'bg-green-500/20' 
                            : 'bg-primary-500/20'
                        }`}>
                          {draft.sent ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <Mail className="w-5 h-5 text-primary-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {draft.subject || `Draft ${index + 1}`}
                            {draft.sent && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                                Sent
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-400">
                            To: {draft.recipient_email || draft.to || draft.recipients?.join(', ') || 'Not specified'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Preview of body */}
                      <p className="text-slate-300 text-sm line-clamp-2 mt-2">
                        {draft.body || draft.content || 'No content'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpandDraft(draft.id || index)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {!draft.sent && (
                        <>
                          <button
                            onClick={() => handleEditDraft(draft)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit draft"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteDraft(draft)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Delete draft"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {expandedDraft === (draft.id || index) && (
                  <div className="border-t border-slate-700 p-4 bg-slate-900/50">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Subject</p>
                        <p className="text-white">{draft.subject || 'No subject'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Body</p>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{draft.body || 'No body'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Recipient</p>
                        <p className="text-slate-300 text-sm">{draft.recipient_email || draft.to || 'Not specified'}</p>
                      </div>
                      {draft.analysis_id && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Analysis ID</p>
                          <p className="text-slate-400 text-xs font-mono">{draft.analysis_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Drafts Yet
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Create a new draft or generate AI-powered email drafts from your LinkedIn analysis.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Create Your First Draft
            </button>
          </div>
        )}
      </div>
    </div>
  );
}