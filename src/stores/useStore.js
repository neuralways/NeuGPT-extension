import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

// Admin emails from environment variable (comma-separated)
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

const applyThemeToDocument = (theme) => {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.body.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = theme;
};

/**
 * Authentication Store
 * Manages user authentication state, profile data, and Gmail connection status
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Auth state
      user: null,
      profile: null,
      token: localStorage.getItem('neugpt_token') || null,
      isAuthenticated: !!localStorage.getItem('neugpt_token'),
      isLoading: false,
      error: null,
      gmailConnected: false,

      /**
       * Set authentication token
       * @param {string} token - Bearer token from OAuth
       */
      setToken: (token) => {
        localStorage.setItem('neugpt_token', token);
        set({ token, isAuthenticated: !!token, isLoading: false });
      },

      /**
       * Initiate Google OAuth login
       */
      login: async () => {
        set({ isLoading: true });
        try {
          authAPI.googleLogin();
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },

      /**
       * Logout user and clear all auth data
       */
      logout: () => {
        localStorage.removeItem('neugpt_token');
        localStorage.removeItem('oauth_state');
        set({
          user: null,
          profile: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          gmailConnected: false,
        });
      },

      /**
       * Fetch current user info from /auth/me endpoint
       */
      fetchUser: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.getMe();
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error.response?.data?.detail || error.message,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      },

      /**
       * Fetch user's full profile
       */
      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.getProfile();
          set({
            profile: response.data,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error.response?.data?.detail || error.message,
            isLoading: false,
          });
        }
      },

      /**
       * Update user's profile
       * @param {object} data - Profile fields to update
       */
      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.updateProfile(data);
          set({
            profile: response.data,
            isLoading: false,
            error: null,
          });
          return response.data;
        } catch (error) {
          set({
            error: error.response?.data?.detail || error.message,
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Check Gmail API connection status
       */
      checkGmailStatus: async () => {
        try {
          const response = await authAPI.getGmailStatus();
          set({
            gmailConnected: response.data.can_send === true,
            error: null,
          });
        } catch (error) {
          console.error('Failed to check Gmail status:', error);
          set({ gmailConnected: false });
        }
      },

      /**
       * Clear error message
       */
      clearError: () => set({ error: null }),

      /**
       * Check if current user is an admin based on email whitelist
       */
      isAdmin: () => {
        const { user, profile } = get();
        if (user?.role === 'admin') return true;
        const email = user?.email || profile?.email || '';
        return ADMIN_EMAILS.includes(email.toLowerCase());
      },
    }),
    {
      name: 'neugpt-auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
        gmailConnected: state.gmailConnected,
      }),
    }
  )
);

/**
 * Application Store
 * Manages app-wide state for YouTube, LinkedIn, drafts, and history
 */
export const useAppStore = create((set, get) => ({
  // YouTube state
  youtubeResults: null,
  youtubeLoading: false,
  youtubeError: null,

  // LinkedIn state
  linkedinResults: null,
  linkedinLoading: false,
  linkedinError: null,

  // Drafts state
  drafts: [],
  draftsLoading: false,
  draftsError: null,

  // History state
  youtubeHistory: [],
  linkedinHistory: [],
  stats: null,
  globalStats: null,
  historyLoading: false,

  // Subscription state
  subscriptionPlans: [],
  mySubscription: null,
  subscriptionHistory: [],
  adminUsers: [],
  adminStats: null,
  subscriptionLoading: false,
  subscriptionError: null,

  // YouTube Actions
  setYoutubeResults: (results) => set({ youtubeResults: results }),
  setYoutubeLoading: (loading) => set({ youtubeLoading: loading }),
  setYoutubeError: (error) => set({ youtubeError: error }),
  resetYoutube: () => set({ youtubeResults: null, youtubeError: null }),

  // LinkedIn Actions
  setLinkedinResults: (results) => set({ linkedinResults: results }),
  setLinkedinLoading: (loading) => set({ linkedinLoading: loading }),
  setLinkedinError: (error) => set({ linkedinError: error }),
  resetLinkedin: () => set({ linkedinResults: null, linkedinError: null }),

  // Drafts Actions
  setDrafts: (drafts) => set({ drafts }),
  setDraftsLoading: (loading) => set({ draftsLoading: loading }),
  setDraftsError: (error) => set({ draftsError: error }),
  resetDrafts: () => set({ drafts: [], draftsError: null }),

  // History Actions
  setYoutubeHistory: (history) => set({ youtubeHistory: history }),
  setLinkedinHistory: (history) => set({ linkedinHistory: history }),
  setStats: (stats) => set({ stats }),
  setHistoryLoading: (loading) => set({ historyLoading: loading }),
  fetchGlobalStats: async (userId) => {
    try {
      const { historyAPI } = await import('../services/api');
      const res = await historyAPI.getStats(userId);
      set({ globalStats: { daily_limit: res.data?.daily_limit || 0, daily_sent: res.data?.daily_sent || 0 } });
    } catch (error) {
      console.error('Failed to fetch global stats:', error);
    }
  },

  // Subscription Actions
  setSubscriptionPlans: (plans) => set({ subscriptionPlans: plans }),
  setMySubscription: (subscription) => set({ mySubscription: subscription }),
  setSubscriptionHistory: (history) => set({ subscriptionHistory: history }),
  setAdminUsers: (users) => set({ adminUsers: users }),
  setAdminStats: (stats) => set({ adminStats: stats }),
  setSubscriptionLoading: (loading) => set({ subscriptionLoading: loading }),
  setSubscriptionError: (error) => set({ subscriptionError: error }),
  resetSubscription: () => set({
    subscriptionPlans: [],
    mySubscription: null,
    subscriptionHistory: [],
    adminUsers: [],
    adminStats: null,
    subscriptionError: null,
  }),
}));

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyThemeToDocument(theme);
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const theme = state.theme === 'dark' ? 'light' : 'dark';
          applyThemeToDocument(theme);
          return { theme };
        }),
    }),
    {
      name: 'neugpt-theme-storage',
      onRehydrateStorage: () => (state) => {
        applyThemeToDocument(state?.theme || 'dark');
      },
    }
  )
);
