/** When true, chat is only allowed for rejected, procurement-failed, or admin-adjusted requests (matches DB RLS). */
export const CHAT_RESTRICTED_MODE = true;

export function requestAllowsChat(
  status: string,
  hasAdminEdit: boolean
): boolean {
  if (!CHAT_RESTRICTED_MODE) return true;
  return (
    status === 'Rejected' ||
    status === 'ProcurementFailed' ||
    hasAdminEdit
  );
}
