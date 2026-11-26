import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Crown,
  FileText,
  Loader2,
  Mail,
  Shield,
  Upload,
  User,
} from 'lucide-react';
import { authAPI, subscriptionAPI, historyAPI } from '../services/api';
import { useAuthStore, useAppStore } from '../stores/useStore';

const listToText = (value) => (Array.isArray(value) ? value.join(', ') : value || '');
const textToList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

export default function Profile() {
  const {
    user,
    profile,
    fetchUser,
    fetchProfile,
    updateProfile,
    gmailConnected,
    checkGmailStatus,
    isAdmin,
  } = useAuthStore();
  const {
    mySubscription,
    subscriptionPlans,
    setMySubscription,
    setSubscriptionPlans,
    setSubscriptionLoading,
    setSubscriptionError,
  } = useAppStore();
  const fileInputRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [subscriptionLoading, setLocalSubscriptionLoading] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const { globalStats, fetchGlobalStats } = useAppStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    email_signature: '',
    skills: '',
    interested_roles: '',
    remote_working_preference: '',
    industry: '',
    years_of_experience: '',
    education_level: '',
    preferred_locations: '',
    availability: '',
    bio: '',
    excluded_domains: '',
    allowed_countries: '',
  });

  useEffect(() => {
    fetchUser();
    fetchProfile();
    checkGmailStatus();
    // Check admin status
    const adminStatus = isAdmin();
    setIsUserAdmin(adminStatus);

    // Fetch subscription data
    const fetchSubscriptionData = async () => {
      setLocalSubscriptionLoading(true);
      try {
        // Fetch available plans
        const plansResponse = await subscriptionAPI.getPlans(true);
        setSubscriptionPlans(plansResponse.data);

        // Fetch user's active subscription
        const subResponse = await subscriptionAPI.getMySubscription();
        setMySubscription(subResponse.data);
      } catch (error) {
        console.error('Failed to fetch subscription data:', error);
        // Don't show error for subscription - it's optional
      } finally {
        setLocalSubscriptionLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [checkGmailStatus, fetchProfile, fetchUser, isAdmin, setMySubscription, setSubscriptionPlans]);

  useEffect(() => {
    if (user && !globalStats) {
      fetchGlobalStats(user.email);
    }
  }, [user, globalStats, fetchGlobalStats]);

  useEffect(() => {
    if (!profile && !user) return;
    setFormData({
      name: profile?.name || user?.name || '',
      email: profile?.email || user?.email || '',
      phone_number: profile?.phone_number || '',
      linkedin_url: profile?.linkedin_url || '',
      github_url: profile?.github_url || '',
      portfolio_url: profile?.portfolio_url || '',
      email_signature: profile?.email_signature || '',
      skills: listToText(profile?.skills),
      interested_roles: listToText(profile?.interested_roles),
      remote_working_preference: profile?.remote_working_preference || '',
      industry: profile?.industry || '',
      years_of_experience: profile?.years_of_experience ?? '',
      education_level: profile?.education_level || '',
      preferred_locations: listToText(profile?.preferred_locations),
      availability: profile?.availability || '',
      bio: profile?.bio || '',
      excluded_domains: listToText(profile?.excluded_domains),
      allowed_countries: listToText(profile?.allowed_countries),
    });
  }, [profile, user]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage('');
    setIsError(false);
    try {
      await updateProfile({
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number,
        linkedin_url: formData.linkedin_url,
        github_url: formData.github_url,
        portfolio_url: formData.portfolio_url,
        email_signature: formData.email_signature,
        skills: textToList(formData.skills),
        interested_roles: textToList(formData.interested_roles),
        remote_working_preference: formData.remote_working_preference,
        industry: formData.industry,
        years_of_experience: formData.years_of_experience === '' ? null : Number(formData.years_of_experience),
        education_level: formData.education_level,
        preferred_locations: textToList(formData.preferred_locations),
        availability: formData.availability,
        bio: formData.bio,
        excluded_domains: textToList(formData.excluded_domains),
        allowed_countries: textToList(formData.allowed_countries),
      });
      if (selectedResume) {
        await authAPI.uploadResume(selectedResume);
        setSelectedResume(null);
      }

      await fetchProfile();
      setEditMode(false);
      setMessage('Profile updated successfully.');
    } catch (error) {
      console.error('Failed to update profile:', error);
      setIsError(true);
      setMessage(error.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResumeSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedResume(file);
    }
  };



  const handleConnectGmail = () => {
    authAPI.googleLogin();
  };

  const fields = [
    ['name', 'Full name', 'text'],
    ['email', 'Email', 'email'],
    ['phone_number', 'Mobile number', 'tel'],
    ['linkedin_url', 'LinkedIn profile URL', 'url'],
    ['github_url', 'GitHub profile URL', 'url'],
    ['portfolio_url', 'Portfolio / personal website', 'url'],
    ['skills', 'Skills', 'text'],
    ['interested_roles', 'Interested roles', 'text'],
    ['remote_working_preference', 'Remote preference', 'text'],
    ['industry', 'Industry', 'text'],
    ['years_of_experience', 'Years of experience', 'number'],
    ['education_level', 'Education level', 'text'],
    ['preferred_locations', 'Preferred locations', 'text'],
    ['availability', 'Availability', 'text'],
    ['excluded_domains', 'Excluded email domains', 'text'],
    ['allowed_countries', 'Allowed countries', 'text'],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {profile?.picture || user?.picture ? (
              <img
                src={profile?.picture || user?.picture}
                alt={profile?.name || user?.name || 'User'}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-500/10">
                <User className="h-8 w-8 text-primary-600 dark:text-primary-300" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                {profile?.name || user?.name || 'Profile'}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Mail className="h-4 w-4" />
                {profile?.email || user?.email || 'No email'}
              </p>
              {profile?.resume && (
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <FileText className="h-4 w-4" />
                  Resume: {profile.resume.file_name}
                </p>
              )}
              {globalStats && globalStats.daily_limit > 0 && (
                <div className="mt-3 w-full max-w-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Daily Mail Quota ({globalStats.daily_sent} / {globalStats.daily_limit})
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${globalStats.daily_sent >= globalStats.daily_limit ? 'bg-red-500' : 'bg-primary-500'}`}
                      style={{ width: `${Math.min((globalStats.daily_sent / globalStats.daily_limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditMode((value) => !value)}
            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {editMode ? 'Cancel' : 'Update Profile'}
          </button>
        </div>
      </section>

      {message && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${isError ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400' : 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400'}`}>
          {isError ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          {message}
        </div>
      )}

      {editMode && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-1 text-lg font-semibold text-slate-950 dark:text-white">Profile & email context</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            These details help personalize drafts. Your contact links are not added to a mail unless you include them in your signature.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map(([name, label, type]) => (
              <label key={name} className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
                <input
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            ))}
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Bio</span>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Signature to show after “Thank you,”</span>
              <textarea
                name="email_signature"
                value={formData.email_signature}
                onChange={handleInputChange}
                rows={3}
                maxLength={500}
                placeholder={'Your name\nPhone or portfolio link (optional)'}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Leave blank to use the generated professional sign-off. Line breaks are preserved.
              </span>
            </label>
            <div className="block md:col-span-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="mb-4 flex items-center gap-2 text-md font-semibold text-slate-950 dark:text-white">
                <FileText className="h-5 w-5" />
                Resume Upload
              </h3>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Supported: PDF, DOC, DOCX. Maximum size is 700KB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeSelect}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Upload className="h-4 w-4" />
                  {selectedResume ? 'Change File' : 'Select Resume'}
                </button>
              </div>
              {selectedResume && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                  Selected: {selectedResume.name}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Save Profile
          </button>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Gmail Sending</h2>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div>
              <p className="font-medium text-slate-950 dark:text-white">Gmail</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {gmailConnected ? 'Connected for sending mail' : 'Connect Gmail to send drafts'}
              </p>
            </div>
            {gmailConnected ? (
              <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-300">
                Connected
              </span>
            ) : (
              <button onClick={handleConnectGmail} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                Connect
              </button>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscription
          </h2>
        {subscriptionLoading ? (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subscription...
          </div>
        ) : mySubscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  {mySubscription.plan_name || 'Active Subscription'}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {mySubscription.status === 'active' ? 'Active' : mySubscription.status}
                  {mySubscription.end_date && ` • Expires: ${new Date(mySubscription.end_date).toLocaleDateString()}`}
                </p>
              </div>
              <span className="rounded-lg bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                {mySubscription.plan_type || 'Active'}
              </span>
            </div>
            {mySubscription.features && mySubscription.features.length > 0 && (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p className="font-medium">Features included:</p>
                <ul className="mt-1 list-inside list-disc">
                  {mySubscription.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">
              No active subscription. Contact admin to get access.
            </p>
            {subscriptionPlans.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Available Plans:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {subscriptionPlans.map((plan) => (
                    <span
                      key={plan.id}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-sm dark:bg-slate-700 dark:text-slate-300"
                    >
                      {plan.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </section>

      {/* Admin Section */}
      {isUserAdmin && (
        <section className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm dark:border-purple-500/30 dark:bg-purple-500/10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-purple-800 dark:text-purple-200">
            <Shield className="h-5 w-5" />
            Admin Panel
          </h2>
          <p className="text-sm text-purple-600 dark:text-purple-400">
            You have admin access. Manage subscriptions from the Dashboard.
          </p>
          <a
            href="/dashboard"
            className="mt-3 inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            Go to Dashboard
          </a>
        </section>
      )}
    </div>
  );
}
