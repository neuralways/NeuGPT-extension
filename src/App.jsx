import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore, useThemeStore } from './stores/useStore';
import Layout from './components/Layout';
import LinkedInAnalyzer from './pages/LinkedInAnalyzer';
import Dashboard from './pages/Dashboard';
import YoutubeAnalyzer from './pages/YoutubeAnalyzer';
import History from './pages/History';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Subscription from './pages/Subscription';
import Admin from './pages/Admin';

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function ThemeSync() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return null;
}

function App() {
  return (
    <Router>
      <ThemeSync />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/linkedin" element={<LinkedInAnalyzer />} />
          <Route path="/youtube" element={<YoutubeAnalyzer />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route
          path="*"
          element={
            <PrivateRoute>
              <Navigate to="/" replace />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
