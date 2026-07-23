import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Brain, Linkedin, Mail, Youtube, Zap, Crown, CreditCard, Users, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { historyAPI, linkedinAPI, subscriptionAPI } from '../services/api';
import { useAppStore, useAuthStore } from '../stores/useStore';

export default function Admin() {
  const { user, profile, fetchUser, fetchProfile, isAuthenticated, isAdmin } = useAuthStore();
  const { stats, setStats } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [linkedinCount, setLinkedinCount] = useState(null);
  const [sentMailCount, setSentMailCount] = useState(0);
  
  // Admin subscription state
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '',
    features: '',
    is_active: true,
  });

  const userId = user?.email;
  const userEmail = user?.email || profile?.email;
  const isUserAdmin = isAdmin();

  useEffect(() => {
    if (isAuthenticated && !user) fetchUser();
    if (isAuthenticated && !profile) fetchProfile();
  }, [fetchProfile, fetchUser, isAuthenticated, profile, user]);

  // Admin: Fetch subscription plans and stats
  useEffect(() => {
    if (isUserAdmin) {
      fetchAdminData();
    }
  }, [isUserAdmin]);

  const fetchAdminData = async () => {
    setAdminLoading(true);
    try {
      const [plansResponse, statsResponse, usersResponse] = await Promise.all([
        subscriptionAPI.getPlans(),
        subscriptionAPI.getAdminStats(),
        subscriptionAPI.getAllUsers(),
      ]);
      const requestsResponse = await subscriptionAPI.getRequests('pending');
      setSubscriptionPlans(plansResponse.data.plans || plansResponse.data || []);
      setAdminStats(statsResponse.data);
      setAdminUsers(usersResponse.data.users || []);
      setSubscriptionRequests(requestsResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleReviewRequest = async (requestId, status) => {
    setAdminLoading(true);
    try {
      await subscriptionAPI.reviewRequest(requestId, { status });
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to review subscription request:', error);
      alert('Failed to review request');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateUserLimit = async (userId, limit) => {
    try {
      await subscriptionAPI.updateUserLimit(userId, { custom_daily_limit: parseInt(limit) });
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to update user limit:', error);
      alert('Failed to update limit');
    }
  };

  const handleCreatePlan = async () => {
    if (!formData.name || !formData.price || !formData.duration_days) {
      alert('Please fill in required fields');
      return;
    }
    setAdminLoading(true);
    try {
      const planData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_days: parseInt(formData.duration_days),
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
        is_active: formData.is_active,
      };
      if (editingPlan) {
        await subscriptionAPI.updatePlan(editingPlan.id, planData);
      } else {
        await subscriptionAPI.createPlan(planData);
      }
      await fetchAdminData();
      resetForm();
    } catch (error) {
      console.error('Failed to save plan:', error);
      alert('Failed to save plan');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      features: plan.features?.join(', ') || '',
      is_active: plan.is_active ?? true,
    });
    setShowSubscriptionForm(true);
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    setAdminLoading(true);
    try {
      await subscriptionAPI.deletePlan(planId);
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to delete plan:', error);
      alert('Failed to delete plan');
    } finally {
      setAdminLoading(false);
    }
  };

  const resetForm = () => {
    setShowSubscriptionForm(false);
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      duration_days: '',
      features: '',
      is_active: true,
    });
  };

  const values = useMemo(() => {
    const read = (...keys) => keys.reduce((value, key) => value ?? stats?.[key], undefined) ?? 0;
    const youtube = read('youtube_searches', 'youtube_count', 'youtube');
    const linkedin = linkedinCount ?? 0;
    const sent = sentMailCount || read('emails_sent', 'sent_emails', 'drafts_sent');
    return {
      youtube,
      linkedin,
      sent,
      total: read('total_searches', 'total') || youtube + linkedin,
    };
  }, [linkedinCount, sentMailCount, stats]);

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

  if (!isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Crown className="w-12 h-12 mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm dark:border-yellow-500/30 dark:bg-yellow-500/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-500/20">
                <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                  Admin: Subscription Management
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage subscription plans and view statistics
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowSubscriptionForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          </div>

          {/* Admin Stats */}
          {adminStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                  <Users className="w-4 h-4" />
                  Total Users
                </div>
                <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">
                  {adminStats.total_users || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                  <CreditCard className="w-4 h-4" />
                  Active Subscriptions
                </div>
                <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">
                  {adminStats.active_subscriptions || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                  <CreditCard className="w-4 h-4" />
                  Total Revenue
                </div>
                <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">
                  ₹{(adminStats.total_revenue || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                  <CreditCard className="w-4 h-4" />
                  Plans Available
                </div>
                <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">
                  {subscriptionPlans.length}
                </p>
              </div>
            </div>
          )}

          {/* Subscription Form */}
          {showSubscriptionForm && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-6">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white mb-4">
                {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Pro Monthly"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="9.99"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Duration (days) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                    placeholder="30"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Active
                  </label>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Plan is active and available
                    </span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Full access to all features"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Features (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="Unlimited searches, Priority support, API access"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreatePlan}
                  disabled={adminLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Subscription Plans List */}
          <div className="mb-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
              Pending Requests ({subscriptionRequests.length})
            </h3>
            {subscriptionRequests.length > 0 ? (
              <div className="space-y-3">
                {subscriptionRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-slate-950 dark:text-white">{request.user_email}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Ref: {request.payment_reference || 'Not provided'}
                        </p>
                        {request.payment_screenshot_url && (
                          <a href={request.payment_screenshot_url} target="_blank" rel="noreferrer" className="text-sm text-primary-600 dark:text-primary-300">
                            View payment screenshot
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleReviewRequest(request.id, 'approved')} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                          Approve
                        </button>
                        <button onClick={() => handleReviewRequest(request.id, 'rejected')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                No pending requests.
              </div>
            )}
          </div>

          {/* Subscription Plans List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
              Subscription Plans ({subscriptionPlans.length})
            </h3>
            {adminLoading && subscriptionPlans.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
            ) : subscriptionPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl p-5 border ${
                      plan.is_active
                        ? 'border-slate-200 dark:border-slate-700'
                        : 'border-slate-300 dark:border-slate-600 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-950 dark:text-white flex items-center gap-2">
                          {plan.name}
                          {!plan.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
                              Inactive
                            </span>
                          )}
                        </h4>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                          ₹{plan.price}
                          <span className="text-sm font-normal text-slate-500">/{plan.duration_days} days</span>
                        </p>
                      </div>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        {plan.description}
                      </p>
                    )}
                    {plan.features && plan.features.length > 0 && (
                      <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 mb-4">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                            {feature}
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="text-slate-400">+{plan.features.length - 3} more</li>
                        )}
                      </ul>
                    )}
                    <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => handleEditPlan(plan)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No subscription plans found. Create your first plan.
              </div>
            )}
          </div>
          
          {/* User Management List */}
          <div className="space-y-4 mt-8">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              User Management ({adminUsers.length})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Daily Limit (Sent/Max)</th>
                    <th className="px-6 py-4 font-medium">Update Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4">{u.display_name || u.name || '-'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-950 dark:text-white">
                        {u.daily_sent_count || 0} / {u.daily_limit || 0}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            defaultValue={u.daily_limit} 
                            id={`limit-${u.id}`}
                            className="w-20 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded"
                          />
                          <button
                            onClick={() => handleUpdateUserLimit(u.id, document.getElementById(`limit-${u.id}`).value)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {adminUsers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

    </div>
  );
}
