import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { isAdminRole, isDeptHeadUser, isFacultyUser } from '../lib/roles';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);
  const didForceReset = useRef(false);
  const { signIn, isAuthenticated, profile, user, loading: authLoading, profileLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const forceFreshLogin = searchParams.get('fresh') === '1';

  useEffect(() => {
    if (!forceFreshLogin || authLoading || didForceReset.current) return;
    didForceReset.current = true;

    const resetIfNeeded = async () => {
      setResettingSession(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.auth.signOut();
        // Remove `fresh` so normal post-signin redirects run.
        navigate('/login', { replace: true });
      } finally {
        setResettingSession(false);
      }
    };

    void resetIfNeeded();
  }, [forceFreshLogin, authLoading, navigate]);

  if (resettingSession || (forceFreshLogin && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  // While a login attempt is in progress, block redirects to avoid navigation flicker.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && !forceFreshLogin) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      );
    }
    // After sign-in, session is ready before `profiles` loads — wait here or we Navigate to `/` too early
    if (!profile && profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      );
    }
    if (!profile) {
      return (
        <Navigate
          to={
            isAdminRole(null, user)
              ? '/colleges'
              : '/'
          }
          replace
        />
      );
    }
    return (
      <Navigate
        to={
          isAdminRole(profile, user)
            ? '/colleges'
            : isDeptHeadUser(profile)
              ? '/dept-head/dashboard'
              : isFacultyUser(profile, user)
              ? '/faculty/dashboard'
              : '/'
        }
        replace
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('No session after sign in.');
      // Session + profile load run in AuthContext; <Navigate> above runs on next render(s)
    } catch (err: any) {
      const message = String(err?.message || '');
      const isInvalidCredentials =
        message.toLowerCase().includes('invalid login credentials') ||
        message.toLowerCase().includes('invalid credentials') ||
        message.toLowerCase().includes('permission denied');
      setError(
        isInvalidCredentials
          ? 'Incorrect email or password. Please try again.'
          : message || 'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <CenteredAlert error={error || undefined} success={undefined} onClose={() => setError('')} />
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="text-center mb-8">
          <Link to="/landing" className="inline-block">
            <div className="inline-flex items-center justify-center mb-4 cursor-pointer hover:opacity-80 transition-opacity">
              <img 
                src="/wmsu1.jpg" 
                alt="WMSU Logo" 
                className="w-32 h-32 rounded-full object-cover drop-shadow-lg"
              />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Western Mindanao State University</h1>
          <p className="text-gray-900 mt-2 font-semibold">WMSU-Procurement</p>
          <p className="text-gray-600 mt-1 text-sm">A Smart Research University by 2040</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-100">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex-1 h-px bg-gray-200" />
              <span className="uppercase tracking-wider">or</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>

            <Link
              to="/signup"
              className="w-full py-3 px-4 border-2 border-red-900 text-red-900 font-semibold rounded-lg transition-colors hover:bg-red-50 text-center block"
            >
              Sign up for Department
            </Link>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-black text-sm mt-6">
          Western Mindanao State University © 2025
        </p>
      </div>
    </div>
  );
};

export default Login;

