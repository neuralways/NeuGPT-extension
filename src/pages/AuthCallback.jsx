import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/useStore';
import { Loader2, AlertCircle } from 'lucide-react';
import { authAPI } from '../services/api';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle Google OAuth errors
        if (error) {
          console.error('Google OAuth error:', error, errorDescription);
          localStorage.removeItem('oauth_state');
          navigate('/login');
          return;
        }

        // Validate code and state
        if (!code || !state) {
          console.error('Missing code or state parameter');
          navigate('/login');
          return;
        }

        // Validate state for CSRF protection
        const storedState = localStorage.getItem('oauth_state');
        if (storedState !== state) {
          console.error('State mismatch - possible CSRF attack');
          localStorage.removeItem('oauth_state');
          navigate('/login');
          return;
        }

        // Exchange authorization code for token
        console.log('Exchanging code for token...');
        const response = await authAPI.exchangeCodeForToken(code, state);

        // Validate response
        if (!response.data.access_token) {
          console.error('No access token in response');
          navigate('/login');
          return;
        }

        // Store token and update auth state
        setToken(response.data.access_token);
        localStorage.removeItem('oauth_state');

        // Redirect to dashboard
        console.log('Login successful, redirecting to dashboard');
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Token exchange failed:', error);
        const errorMessage = error.response?.data?.detail || error.message;
        console.error('Error detail:', errorMessage);

        // Store error in session for display on login page
        sessionStorage.setItem('auth_error', errorMessage);
        localStorage.removeItem('oauth_state');

        // Redirect back to login with error
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, setToken]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
          <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-white text-lg font-semibold mb-2">
            Completing sign in...
          </p>
          <p className="text-slate-400 text-sm">
            Exchanging authorization code for access token
          </p>
        </div>
      </div>
    </div>
  );
}