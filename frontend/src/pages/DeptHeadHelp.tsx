import { Link } from 'react-router-dom';

export default function DeptHeadHelp() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">College Admin Help</h1>
          <p className="mt-1 text-gray-600">
            Guidelines on how College Admin users manage budget, departments, and request tracking.
          </p>
        </div>
        <Link
          to="/dept-head/dashboard"
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xl font-semibold text-gray-900">College Admin Main Functions</h2>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-700">
          <li>Monitor handled college budget and verify spending against approved allocation.</li>
          <li>Review procurement requests and prioritize pending or rejected items that need action.</li>
          <li>Oversee department records under your assigned college.</li>
          <li>Coordinate with faculty requestors and enforce procurement policy compliance.</li>
        </ul>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xl font-semibold text-gray-900">How to Use the Dashboard</h2>
        <ol className="mt-3 list-decimal list-inside space-y-2 text-gray-700">
          <li>Open Dashboard to check budget, notifications, and new request counts.</li>
          <li>Open Budget to review remaining funds before approving actions.</li>
          <li>Open Request &amp; History to process pending requests and review status updates.</li>
          <li>Use Departments page to validate department ownership and assigned users.</li>
        </ol>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xl font-semibold text-gray-900">Departments Page Guidelines</h2>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-700">
          <li>Confirm each listed department belongs to your handled college.</li>
          <li>Check user names and email addresses for correctness before escalation.</li>
          <li>Report missing or incorrect department assignments to the WMSU Admin.</li>
          <li>Use this page as the reference when routing concerns to the correct department.</li>
        </ul>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xl font-semibold text-gray-900">Good Practices</h2>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-700">
          <li>Check new requests daily and avoid long pending queues.</li>
          <li>Ensure budget decisions are documented and consistent with policy.</li>
          <li>Keep communication clear between college admin and department users.</li>
          <li>Sign out after each session, especially when using shared devices.</li>
        </ul>
      </section>
    </div>
  );
}
