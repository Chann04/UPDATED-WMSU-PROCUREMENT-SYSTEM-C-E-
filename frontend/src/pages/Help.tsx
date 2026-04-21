import { Link } from 'react-router-dom';

export default function Help() {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-14 bg-red-900 border-b border-red-800 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/wmsu1.jpg" alt="WMSU" className="w-8 h-8 rounded-full object-cover border border-red-800" />
          <span className="font-bold text-white text-sm sm:text-base">WMSU-Procurement</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/" className="px-3 sm:px-4 py-2 text-sm text-red-100 hover:bg-red-800 rounded transition-colors">
            Home
          </Link>
          <Link to="/login?fresh=1" className="px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-red-800 rounded transition-colors">
            Log in
          </Link>
        </div>
      </nav>

      <main className="flex-1 pt-20 pb-12 px-4 sm:px-6">
        <section className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Help Center</h1>
          <p className="mt-3 text-gray-600">
            Follow these guidelines to sign in to the WMSU-Procurement system successfully.
          </p>

          <h2 className="mt-8 text-xl font-semibold text-gray-900">Login Guidelines</h2>
          <ol className="mt-3 list-decimal list-inside space-y-2 text-gray-700">
            <li>Open the login page by clicking the <span className="font-semibold">Log in</span> button in the top-right navigation.</li>
            <li>Enter your registered institutional email in the email field.</li>
            <li>Type your account password carefully. Passwords are case-sensitive.</li>
            <li>Click the <span className="font-semibold">Sign in</span> button and wait for redirection to your dashboard.</li>
          </ol>

          <h2 className="mt-8 text-xl font-semibold text-gray-900">Before You Log In</h2>
          <ul className="mt-3 list-disc list-inside space-y-2 text-gray-700">
            <li>Make sure your account has already been created by the system administrator.</li>
            <li>Use a stable internet connection to avoid session interruptions.</li>
            <li>Use a modern browser (Chrome, Edge, or Firefox) for best compatibility.</li>
          </ul>

          <h2 className="mt-8 text-xl font-semibold text-gray-900">If You Cannot Log In</h2>
          <ul className="mt-3 list-disc list-inside space-y-2 text-gray-700">
            <li>Check if your email format is correct and does not contain extra spaces.</li>
            <li>Try retyping your password and verify Caps Lock is off.</li>
            <li>If the issue continues, contact the procurement system administrator for account verification or password reset.</li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login?fresh=1"
              className="inline-flex items-center px-4 py-2 rounded-md bg-red-900 text-white text-sm font-medium hover:bg-red-800 transition-colors"
            >
              Go to Login
            </Link>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
