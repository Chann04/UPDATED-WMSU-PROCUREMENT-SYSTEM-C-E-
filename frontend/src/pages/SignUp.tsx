import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Loader2,
  User,
  Building2,
  Layers,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  collegesAPI,
  registrationAPI,
  WMSU_DEFAULT_COLLEGES,
} from '../lib/supabaseApi';
import { getDepartmentsForCollege } from '../lib/departments';
import { CenteredAlert } from '../components/CenteredAlert';

type FormState = {
  firstName: string;
  middleInitial: string;
  lastName: string;
  email: string;
  college: string;
  department: string;
  password: string;
  confirmPassword: string;
};

const INITIAL_FORM: FormState = {
  firstName: '',
  middleInitial: '',
  lastName: '',
  email: '',
  college: '',
  department: '',
  password: '',
  confirmPassword: '',
};

const GMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

type PwRules = {
  length: boolean;
  uppercase: boolean;
  number: boolean;
};

const evaluatePassword = (pw: string): PwRules => ({
  length: pw.length >= 8,
  uppercase: /[A-Z]/.test(pw),
  number: /\d/.test(pw),
});

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [colleges, setColleges] = useState<string[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signUpOutcome, setSignUpOutcome] = useState<
    'email_sent' | 'no_email_confirmation' | null
  >(null);
  const [resendState, setResendState] = useState<
    'idle' | 'loading' | 'sent' | 'error'
  >('idle');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    /**
     * The /signup page is public (unauthenticated). If the `colleges` table
     * only grants access to authenticated users, `getAll()` may return an
     * empty list. We merge anything the DB gives us with the canonical
     * WMSU_DEFAULT_COLLEGES list so the dropdown is always populated with
     * the full 18-college roster.
     */
    const loadColleges = async () => {
      try {
        try {
          await collegesAPI.ensureDefaults();
        } catch {
          /* best-effort; anon users can't write */
        }

        let dbNames: string[] = [];
        try {
          const rows = await collegesAPI.getAll();
          dbNames = rows.map((c) => c.name);
        } catch {
          /* anon read may be blocked by RLS; fall through to defaults */
        }

        const merged = Array.from(new Set([...WMSU_DEFAULT_COLLEGES, ...dbNames]));
        merged.sort((a, b) => a.localeCompare(b));
        setColleges(merged);
      } catch (e: any) {
        // Last-resort fallback: still show the canonical roster.
        setColleges([...WMSU_DEFAULT_COLLEGES].sort((a, b) => a.localeCompare(b)));
        setError(e?.message || '');
      } finally {
        setLoadingColleges(false);
      }
    };
    void loadColleges();
  }, []);

  const departments = useMemo(
    () => getDepartmentsForCollege(form.college),
    [form.college]
  );

  const pwRules = evaluatePassword(form.password);
  const passwordValid = pwRules.length && pwRules.uppercase && pwRules.number;
  const passwordsMatch =
    form.password.length > 0 && form.password === form.confirmPassword;

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'college' ? { department: '' } : null),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First Name and Last Name are required.');
      return;
    }
    if (!GMAIL_PATTERN.test(form.email.trim())) {
      setError('Please enter a valid Gmail address (must end with @gmail.com).');
      return;
    }
    if (!form.college) {
      setError('Please select a college.');
      return;
    }
    if (!form.department) {
      setError('Please select a department.');
      return;
    }
    if (!passwordValid) {
      setError(
        'Password must be at least 8 characters and contain at least one uppercase letter and one number.'
      );
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const outcome = await registrationAPI.signUp({
        firstName: form.firstName.trim(),
        middleInitial: form.middleInitial.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        college: form.college,
        department: form.department,
        emailRedirectTo: `${window.location.origin}/login`,
      });

      if (outcome.alreadyRegistered) {
        setError(
          'An account with this email already exists. Try signing in, or use the "Resend verification" option if you still need to confirm your email.'
        );
        return;
      }

      setSubmittedEmail(form.email.trim());
      setSignUpOutcome(outcome.confirmationRequired ? 'email_sent' : 'no_email_confirmation');
      setForm(INITIAL_FORM);
    } catch (err: any) {
      const rawMsg = String(err?.message || 'Sign-up failed. Please try again.');
      const code = (err as { code?: string }).code;
      const status = (err as { status?: number }).status;

      let friendly = rawMsg;
      const lower = rawMsg.toLowerCase();
      if (lower.includes('already registered') || lower.includes('user already')) {
        friendly = 'An account with this email already exists.';
      } else if (lower.includes('rate limit') || status === 429) {
        friendly =
          'Too many sign-up attempts in a short period. Supabase is rate-limiting email sends — please wait a few minutes and try again.';
      } else if (lower.includes('invalid') && lower.includes('email')) {
        friendly = 'That email address was rejected by the authentication server.';
      } else if (lower.includes('password')) {
        friendly = rawMsg;
      } else if (lower.includes('smtp') || lower.includes('send email')) {
        friendly =
          'Supabase reported an email-send failure. Check your Supabase Dashboard → Authentication → Emails (SMTP settings) and the project logs.';
      }

      setError(
        `${friendly}${code ? ` (code: ${code})` : ''}${status ? ` (status: ${status})` : ''}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setResendState('loading');
    setResendError('');
    try {
      await registrationAPI.resendConfirmation(
        submittedEmail,
        `${window.location.origin}/login`
      );
      setResendState('sent');
    } catch (err: any) {
      setResendState('error');
      const status = (err as { status?: number }).status;
      const msg = String(err?.message || 'Failed to resend verification email.');
      setResendError(
        status === 429
          ? 'Too many resend requests. Supabase is rate-limiting this email. Please wait a few minutes.'
          : msg
      );
    }
  };

  if (submittedEmail) {
    const confirmationsDisabled = signUpOutcome === 'no_email_confirmation';
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-900 mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {confirmationsDisabled
              ? 'Registration submitted'
              : 'Verify your email'}
          </h1>

          {confirmationsDisabled ? (
            <>
              <p className="text-gray-600 mt-2">
                Your account was created for{' '}
                <span className="font-semibold text-gray-900">{submittedEmail}</span>.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left text-sm text-amber-900">
                <p className="font-semibold">No verification email was sent.</p>
                <p className="mt-1">
                  "Confirm email" is currently <span className="font-semibold">disabled</span> in
                  your Supabase project. Enable it under{' '}
                  <span className="font-mono">Authentication → Providers → Email</span>{' '}
                  so real users receive a verification link.
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-600 mt-2">
              We just sent a verification link to{' '}
              <span className="font-semibold text-gray-900">{submittedEmail}</span>. Click
              the link in that email to confirm your address. If it does not arrive in
              the next few minutes, check your <span className="font-semibold">Spam</span>{' '}
              or <span className="font-semibold">Promotions</span> folder.
            </p>
          )}

          <p className="text-sm text-gray-500 mt-4">
            After you verify, your College Admin will review your registration. You will
            be able to sign in once they approve your account.
          </p>

          {!confirmationsDisabled && (
            <div className="mt-5">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === 'loading' || resendState === 'sent'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-red-900 text-red-900 hover:bg-red-50 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resendState === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resending…
                  </>
                ) : resendState === 'sent' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verification email resent
                  </>
                ) : (
                  <>Resend verification email</>
                )}
              </button>
              {resendState === 'error' && (
                <p className="text-xs text-red-700 mt-2">{resendError}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-red-900 text-white rounded-lg hover:bg-red-800 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <CenteredAlert
        error={error || undefined}
        success={undefined}
        onClose={() => setError('')}
      />
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <Link to="/landing" className="inline-block">
            <img
              src="/wmsu1.jpg"
              alt="WMSU Logo"
              className="w-24 h-24 rounded-full object-cover drop-shadow mx-auto"
            />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">
            Sign up for Department
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Create a Department account. Your College Admin must approve it before you
            can sign in.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
          <div className="bg-red-900 text-white px-6 py-3">
            <h2 className="text-base font-semibold">Registration Details</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  First Name
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => onChange('firstName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Middle Initial
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={form.middleInitial}
                  onChange={(e) => onChange('middleInitial', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Last Name
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => onChange('lastName', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Gmail Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChange('email', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                placeholder="you@gmail.com"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be a Gmail address. We will send a verification link to this email.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Select College
                </label>
                <select
                  value={form.college}
                  onChange={(e) => onChange('college', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  disabled={loadingColleges}
                  required
                >
                  <option value="">
                    {loadingColleges ? 'Loading…' : 'Select college'}
                  </option>
                  {colleges.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Layers className="w-4 h-4 inline mr-2" />
                  Select Department
                </label>
                <select
                  value={form.department}
                  onChange={(e) => onChange('department', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={!form.college || departments.length === 0}
                  required
                >
                  <option value="">
                    {!form.college
                      ? 'Select a college first'
                      : departments.length === 0
                        ? 'No departments listed'
                        : 'Select department'}
                  </option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {form.college && departments.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    No departments are configured for this college yet. Please contact
                    your College Admin.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => onChange('password', e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                <li className={pwRules.length ? 'text-green-700' : 'text-gray-500'}>
                  • At least 8 characters
                </li>
                <li className={pwRules.uppercase ? 'text-green-700' : 'text-gray-500'}>
                  • At least 1 uppercase letter (A–Z)
                </li>
                <li className={pwRules.number ? 'text-green-700' : 'text-gray-500'}>
                  • At least 1 number (0–9)
                </li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => onChange('confirmPassword', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                required
                minLength={8}
              />
              {form.confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-700 mt-1">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-red-900 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already registered?{' '}
              <Link to="/login" className="text-red-900 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-black text-sm mt-6">
          Western Mindanao State University © 2025
        </p>
      </div>
    </div>
  );
}
