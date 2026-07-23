import axios from 'axios';
import { useAuthStore } from '../stores/useStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://neugpt-h8f5fgbjhwhpcyhb.eastasia-01.azurewebsites.net';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1063373789837-uhmjai4ipe0adekn2166ggj0tgfsbbbl.apps.googleusercontent.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to generate secure OAuth state
function generateOAuthState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let state = '';
  for (let i = 0; i < 64; i++) {
    state += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return state;
}

// Add Bearer token to requests (OAuth)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('neugpt_token');
  if (token) {
    // Use Bearer token for OAuth tokens
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Properly logout and clear auth state to prevent redirect loop
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Auth API - Google OAuth Integration
// ============================================================================
export const authAPI = {
  /**
   * Initiate Google OAuth login flow
   * Redirects user to Google consent screen
   */
  googleLogin: () => {
    // Generate and store state for CSRF protection
    const state = generateOAuthState();
    localStorage.setItem('oauth_state', state);

    // If running in a Chrome extension, use launchWebAuthFlow
    if (window.chrome && chrome.identity) {
      const redirectUri = chrome.identity.getRedirectURL();
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
        state: state,
        prompt: 'select_account'
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true
        },
        function(redirect_url) {
          if (chrome.runtime.lastError || !redirect_url) {
            console.error(chrome.runtime.lastError);
            useAuthStore.getState().logout();
            return;
          }
          
          // Parse the redirect URL
          const urlParams = new URLSearchParams(new URL(redirect_url).search);
          const code = urlParams.get('code');
          const returnedState = urlParams.get('state');

          if (code) {
            // Because the frontend router isn't handling this redirect directly,
            // we manually call the token exchange here.
            useAuthStore.setState({ isLoading: true });
            
            api.post('/auth/google/frontend-token', new URLSearchParams({
              code,
              state: returnedState,
              redirect_uri: redirectUri // We must pass the exact redirect_uri we used
            }), {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }).then(response => {
              const { access_token } = response.data;
              useAuthStore.getState().setToken(access_token);
              useAuthStore.getState().fetchUser();
            }).catch(err => {
              console.error('Failed to exchange code:', err);
              useAuthStore.getState().logout();
            });
          }
        }
      );
    } else {
      // Normal web context fallback
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: `${window.location.origin}/auth/callback`,
        response_type: 'code',
        scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
        state: state,
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
  },

  /**
   * Exchange authorization code for token
   * Called after user is redirected back from Google
   * @param {string} code - Authorization code from Google
   * @param {string} state - State parameter for CSRF validation
   * @returns {Promise} Token response with access_token
   */
  exchangeCodeForToken: (code, state) => {
    return api.post('/auth/google/frontend-token', new URLSearchParams({
      code,
      state,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  /**
   * Get current authenticated user info
   */
  getMe: () => api.get('/auth/me'),

  /**
   * Get current user's full profile
   */
  getProfile: () => api.get('/auth/profile'),

  /**
   * Update current user's profile
   */
  updateProfile: (data) => api.patch('/auth/profile', data),

  /**
   * Upload user's resume
   */
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/auth/profile/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Get user's resume
   */
  getResume: () => api.get('/auth/profile/resume'),

  /**
   * Delete user's resume
   */
  deleteResume: () => api.delete('/auth/profile/resume'),

  /**
   * Check Gmail API status
   */
  getGmailStatus: () => api.get('/auth/gmail/status'),
};

// ============================================================================
// YouTube API
// ============================================================================
export const youtubeAPI = {
  analyzeSentiments: (videoUrl, maxComments = 20000) =>
    api.post('/youtube/analyze-sentiments', null, {
      params: { video_url: videoUrl, max_comments: maxComments },
    }),

  getComments: (videoUrl, maxComments = 1000) =>
    api.get('/youtube/comments', {
      params: { video_url: videoUrl, max_comments: maxComments },
    }),

  getTranscript: (url) =>
    api.get('/youtube/transcript', { params: { url } }),

  downloadVideo: (url) =>
    api.post('/youtube/download', { url }, { responseType: 'blob' }),
};

// ============================================================================
// LinkedIn API
// ============================================================================
export const linkedinAPI = {
  /**
   * Upload and analyze LinkedIn posts from CSV
   */
  analyzePosts: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/linkedin/analyze-posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Preview email drafts logic
   */
  previewDrafts: (params = {}) => api.post('/linkedin/draft/preview', params),

  /**
   * Generate email drafts from analyzed posts
   */
  generateDrafts: (params = {}) => api.post('/linkedin/draft/mails', params),

  /**
   * Send all generated drafts
   * @param {boolean} includeResume - Whether to include user's resume
   */
  sendDrafts: (includeResume = false) =>
    api.post('/linkedin/draft/send', null, {
      params: { include_resume: includeResume },
    }),

  /**
   * Get all generated drafts
   */
  getDrafts: ({ sent, limit, cursor } = {}) =>
    api.get('/linkedin/draft/drafts', {
      params: { sent, limit, cursor },
    }),

  /**
   * Get LinkedIn analysis history
   */
  getHistory: ({ userId, email, limit = 20, latest = false } = {}) =>
    api.get('/history/linkedin', {
      params: { user_id: userId, email, limit, latest },
    }),

  /**
   * Update a specific draft
   */
  updateDraft: (draftId, data) => api.put(`/linkedin/draft/${draftId}`, data),

  /**
   * Delete a specific draft
   */
  deleteDraft: (draftId) => api.delete(`/linkedin/draft/${draftId}`),
};

// ============================================================================
// History API
// ============================================================================
export const historyAPI = {
  getYoutubeHistory: (userId, limit = 20, daysBack) =>
    api.get('/history/youtube', { params: { user_id: userId, limit, days_back: daysBack } }),

  getLinkedinHistory: ({ userId, email, limit = 20, latest = false, daysBack, cursor } = {}) =>
    api.get('/history/linkedin', {
      params: { user_id: userId, email, limit, latest, days_back: daysBack, cursor },
    }),

  getStats: (userId) =>
    api.get('/history/stats', { params: { user_id: userId } }),

  deleteYoutubeSearch: (userId, searchId) =>
    api.delete(`/history/youtube/${searchId}`, { params: { user_id: userId } }),
};

// ============================================================================
// Draft Mail API
// ============================================================================
export const draftMailAPI = {
  // Generate drafts from provided data
  generateDrafts: (data) => api.post('/draft-mail/generate-drafts', data),

  // Create drafts from latest LinkedIn analysis with optional filters
  createLatestDrafts: (params = {}) => api.post('/draft-mail/create-latest-drafts', null, { params }),

  // Get drafts (optionally filter by analysis_id and sent status)
  getDrafts: (params = {}) => api.get('/draft-mail/drafts', { params: { ...params, _t: Date.now() } }),

  // Get draft statistics for an analysis
  getDraftStats: (analysisId) => api.get(`/draft-mail/stats/${analysisId}`),

  // Update a specific draft
  updateDraft: (draftId, data) => api.put(`/draft-mail/${draftId}`, data),

  // Send all pending drafts
  sendAllDrafts: (params = {}) => api.post('/draft-mail/send-all', null, { params }),

  // Send stored drafts (from latest analysis)
  sendStoredDrafts: (params = {}) => api.post('/draft-mail/send-stored', null, { params }),
};

// ============================================================================
// Subscription API
// ============================================================================
export const subscriptionAPI = {
  // Public endpoints
  /**
   * Get all available subscription plans
   */
  getPlans: (activeOnly = true) =>
    api.get('/subscriptions/plans', { params: { active_only: activeOnly } }),

  /**
   * Get a specific subscription plan
   */
  getPlan: (planId) => api.get(`/subscriptions/plans/${planId}`),

  // User endpoints (authenticated)
  /**
   * Get current user's active subscription
   */
  getMySubscription: () => api.get('/subscriptions/my/subscription'),

  /**
   * Get current user's subscription history
   */
  getMySubscriptionHistory: () => api.get('/subscriptions/my/history'),

  // Admin endpoints
  /**
   * Create a new subscription plan (admin only)
   */
  createPlan: (planData) => api.post('/subscriptions/plans', planData),

  /**
   * Update a subscription plan (admin only)
   */
  updatePlan: (planId, planData) => api.put(`/subscriptions/plans/${planId}`, planData),

  /**
   * Delete a subscription plan (admin only)
   */
  deletePlan: (planId) => api.delete(`/subscriptions/plans/${planId}`),

  createRequest: (data) => api.post('/subscriptions/requests', data),
  getMyRequests: () => api.get('/subscriptions/my/requests'),
  getRequests: (statusFilter) =>
    api.get('/subscriptions/admin/requests', {
      params: { status_filter: statusFilter },
    }),
  reviewRequest: (requestId, data) =>
    api.patch(`/subscriptions/admin/requests/${requestId}`, data),

  /**
   * Assign a subscription to a user (admin only)
   */
  assignSubscription: (data) => api.post('/subscriptions/assign', data),

  /**
   * Update a user's subscription (admin only)
   */
  updateUserSubscription: (userEmail, data) =>
    api.patch(`/subscriptions/user/${encodeURIComponent(userEmail)}`, data),

  /**
   * Cancel a user's subscription (admin only)
   */
  cancelUserSubscription: (userEmail) =>
    api.delete(`/subscriptions/user/${encodeURIComponent(userEmail)}`),

  /**
   * Get all users (admin only)
   */
  getAllUsers: (params = {}) =>
    api.get('/subscriptions/admin/users', { params }),

  /**
   * Get detailed user information (admin only)
   */
  getUserDetails: (userEmail) =>
    api.get(`/subscriptions/admin/users/${encodeURIComponent(userEmail)}`),

  /**
   * Update a user's custom limit (admin only)
   */
  updateUserLimit: (userId, data) =>
    api.patch(`/subscriptions/admin/users/${userId}/limit`, data),

  /**
   * Get admin dashboard statistics
   */
  getAdminStats: () => api.get('/subscriptions/admin/stats'),

  /**
   * Get all user subscriptions (admin only)
   */
  getAllSubscriptions: (statusFilter) =>
    api.get('/subscriptions/admin/all-subscriptions', {
      params: { status_filter: statusFilter },
    }),
};

export default api;
