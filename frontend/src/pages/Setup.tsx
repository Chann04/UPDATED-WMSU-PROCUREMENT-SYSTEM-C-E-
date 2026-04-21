/**
 * Setup Page
 * 
 * A page to help users verify their Supabase connection
 * and set up the system properly.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import ConnectionTest from '../components/ConnectionTest';
import { 
  CheckCircle, 
  Circle,
  ExternalLink,
  Copy,
  Check,
  Database,
  Key,
  FileCode,
  Rocket
} from 'lucide-react';

const Setup = () => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const steps = [
    {
      title: 'Create Supabase Account',
      description: 'Sign up for a free Supabase account if you haven\'t already.',
      action: {
        label: 'Go to Supabase',
        url: 'https://supabase.com'
      },
      completed: true // Can't check this automatically
    },
    {
      title: 'Create a New Project',
      description: 'In Supabase Dashboard, click "New Project" and give it a name (e.g., "procurement-system").',
      tips: [
        'Choose a strong database password and save it somewhere safe',
        'Select a region close to your users',
        'Wait for the project to finish setting up (about 2 minutes)'
      ]
    },
    {
      title: 'Get Your API Keys',
      description: 'Go to Settings → API in your Supabase project.',
      action: {
        label: 'Open API Settings',
        url: 'https://supabase.com/dashboard/project/_/settings/api'
      },
      tips: [
        'Copy the "Project URL" (looks like https://xxxxx.supabase.co)',
        'Copy the "anon public" key (starts with eyJ...)'
      ]
    },
    {
      title: 'Update Your .env File',
      description: 'Paste your keys into frontend/.env',
      code: `VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`
    },
    {
      title: 'Run Database Migrations',
      description: 'In Supabase Dashboard → SQL Editor, run the migration files.',
      tips: [
        'Open supabase/migrations/001_initial_schema.sql',
        'Copy and paste into SQL Editor',
        'Click "Run"',
        'Repeat for 002_comments_and_delegation.sql'
      ]
    },
    {
      title: 'Restart Dev Server',
      description: 'Stop and restart your development server to load the new environment variables.',
      code: `# Stop the server (Ctrl+C) then run:
npm run dev`
    },
    {
      title: 'Test Connection',
      description: 'Use the test panel below to verify everything is working.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img 
              src="/wmsu1.jpg" 
              alt="WMSU Logo" 
              className="w-20 h-20 rounded-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-wmsu-black">Supabase Setup Guide</h1>
          <p className="text-slate-500 mt-2">Follow these steps to connect your Procurement System to Supabase</p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-red-900">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-wmsu-black flex items-center gap-2">
                    {step.title}
                    {index === 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        Start here
                      </span>
                    )}
                  </h3>
                  <p className="text-slate-600 mt-1">{step.description}</p>

                  {/* Action Button */}
                  {step.action && (
                    <a
                      href={step.action.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                    >
                      {step.action.label}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {/* Tips */}
                  {step.tips && (
                    <ul className="mt-3 space-y-1">
                      {step.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                          <Circle className="w-1.5 h-1.5 mt-2 fill-slate-400 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Code Block */}
                  {step.code && (
                    <div className="mt-3 relative">
                      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto">
                        <code>{step.code}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(step.code!, index)}
                        className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        {copiedStep === index ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Connection Test */}
        <ConnectionTest />

        {/* Success Actions */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 mb-4">Once the connection test passes, you're ready to go!</p>
          <div className="flex justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-3 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Rocket className="w-5 h-5" />
              Go to Login
            </Link>
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;

