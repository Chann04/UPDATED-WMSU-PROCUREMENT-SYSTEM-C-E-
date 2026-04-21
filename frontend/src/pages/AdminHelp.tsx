export default function AdminHelp() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Help & Guidelines</h1>
        <p className="mt-2 text-gray-600">
          This page explains how college administrators use the WMSU-Procurement system and what each module is for.
        </p>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-900">Admin Role and Main Function</h2>
        <p className="mt-3 text-gray-700">
          The admin manages procurement records, user access, and budget visibility across the system. The role ensures
          that requests, departments, and related records are accurate and aligned with procurement rules.
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-900">Module Guide (What each menu does)</h2>
        <ul className="mt-3 space-y-3 text-gray-700">
          <li>
            <span className="font-semibold">Budget:</span> Review and monitor approved allocations and remaining balances.
          </li>
          <li>
            <span className="font-semibold">Users:</span> Manage user accounts, roles, and access rights (Admin, DeptHead, Faculty).
          </li>
          <li>
            <span className="font-semibold">Colleges:</span> Maintain college records and related institutional groupings.
          </li>
          <li>
            <span className="font-semibold">Logs:</span> Track recent activities for audit and accountability.
          </li>
        </ul>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-900">Recommended Admin Workflow</h2>
        <ol className="mt-3 list-decimal list-inside space-y-2 text-gray-700">
          <li>Open the Dashboard to check current request and budget status.</li>
          <li>Review Budget values and verify entries before making updates.</li>
          <li>Check Users to confirm role assignments are correct.</li>
          <li>Update Colleges information when organizational data changes.</li>
          <li>Inspect Logs regularly to detect unusual actions or failed operations.</li>
        </ol>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-gray-900">Good Practices</h2>
        <ul className="mt-3 list-disc list-inside space-y-2 text-gray-700">
          <li>Use official WMSU accounts only and keep credentials private.</li>
          <li>Apply role changes carefully to avoid unauthorized access.</li>
          <li>Sign out after each session, especially on shared computers.</li>
          <li>Record major updates and confirm they appear correctly in Logs.</li>
        </ul>
      </section>
    </div>
  );
}
