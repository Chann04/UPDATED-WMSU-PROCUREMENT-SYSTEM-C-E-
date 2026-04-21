/**
 * Connection Test Component
 * 
 * A simple component to verify Supabase connection.
 * Shows status and helpful error messages.
 */

import { useState } from 'react';
import { testSupabaseConnection, ConnectionTestResult } from '../lib/testConnection';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Database,
  Shield,
  Link
} from 'lucide-react';

const ConnectionTest = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      const testResult = await testSupabaseConnection();
      setResult(testResult);
    } catch (err) {
      setResult({
        success: false,
        message: 'Test failed unexpectedly',
        details: {
          url: 'Unknown',
          authStatus: 'error',
          databaseStatus: 'error',
          tablesFound: [],
          error: String(err)
        }
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: 'connected' | 'not_authenticated' | 'error' | 'no_tables') => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'not_authenticated':
        return <CheckCircle className="w-5 h-5 text-amber-500" />;
      case 'no_tables':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <XCircle className="w-5 h-5 text-rose-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-wmsu-black flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-400" />
          Supabase Connection Test
        </h3>
        <button
          onClick={runTest}
          disabled={testing}
          className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>
      </div>

      {!result && !testing && (
        <div className="text-center py-8 text-slate-400">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Click "Run Test" to verify your Supabase connection</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className={`p-4 rounded-lg ${
            result.success 
              ? 'bg-emerald-50 border border-emerald-200' 
              : result.details.databaseStatus === 'no_tables'
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-rose-50 border border-rose-200'
          }`}>
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              ) : result.details.databaseStatus === 'no_tables' ? (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-500" />
              )}
              <div>
                <p className={`font-semibold ${
                  result.success ? 'text-emerald-800' : 
                  result.details.databaseStatus === 'no_tables' ? 'text-amber-800' : 'text-rose-800'
                }`}>
                  {result.success ? 'Connection Successful!' : 
                   result.details.databaseStatus === 'no_tables' ? 'Almost There!' : 'Connection Failed'}
                </p>
                <p className={`text-sm ${
                  result.success ? 'text-emerald-600' : 
                  result.details.databaseStatus === 'no_tables' ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {result.message}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* URL Status */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Project URL</span>
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">
                {result.details.url}
              </p>
            </div>

            {/* Auth Status */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Auth Service</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(result.details.authStatus)}
                <span className="text-sm text-slate-700 capitalize">
                  {result.details.authStatus.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Database Status */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Database</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(result.details.databaseStatus)}
                <span className="text-sm text-slate-700 capitalize">
                  {result.details.databaseStatus.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Tables Found */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-600">Categories Found</span>
              </div>
              <p className="text-sm text-slate-700">
                {result.details.tablesFound.length > 0 
                  ? result.details.tablesFound.join(', ')
                  : 'None (run migrations first)'}
              </p>
            </div>
          </div>

          {/* Error Details */}
          {result.details.error && (
            <div className="p-4 bg-rose-50 rounded-lg">
              <p className="text-sm font-medium text-rose-800 mb-1">Error Details:</p>
              <p className="text-sm text-rose-600 font-mono">{result.details.error}</p>
            </div>
          )}

          {/* Help Text */}
          {!result.success && (
            <div className="p-4 bg-slate-100 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-2">Troubleshooting:</p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                {result.details.url.includes('YOUR-PROJECT-ID') && (
                  <li>Update VITE_SUPABASE_URL in your .env file with your real project URL</li>
                )}
                {result.details.error?.includes('ANON_KEY') && (
                  <li>Update VITE_SUPABASE_ANON_KEY in your .env file with your real anon key</li>
                )}
                {result.details.databaseStatus === 'no_tables' && (
                  <li>Run the SQL migrations in Supabase Dashboard → SQL Editor</li>
                )}
                <li>Make sure you've restarted the dev server after changing .env</li>
                <li>Check that your Supabase project is not paused</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;

