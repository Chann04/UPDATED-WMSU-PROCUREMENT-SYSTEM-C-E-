const STORAGE_KEY = 'wmsu_header_notif_dismissed_v2';

type UserDismiss = {
  /** Request IDs user dismissed from the "pending college action" bucket while still pending. */
  pending: Record<string, string>;
  /** Request IDs dismissed from declined / procurement-failed alerts. */
  attention: Record<string, string>;
  /** Last registration pending count the college admin acknowledged in the header. */
  registrationSeenCount: number;
};

type Root = Record<string, UserDismiss>;

const emptyUser = (): UserDismiss => ({
  pending: {},
  attention: {},
  registrationSeenCount: 0,
});

const readRoot = (): Root => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Root;
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
};

const writeRoot = (root: Root) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
};

const getUser = (userId: string): UserDismiss => {
  const root = readRoot();
  return root[userId] ? { ...emptyUser(), ...root[userId] } : emptyUser();
};

const saveUser = (userId: string, data: UserDismiss) => {
  const root = readRoot();
  root[userId] = data;
  writeRoot(root);
};

/** Remove dismiss entries for requests no longer in the given sets (status changed). */
export function cleanupHeaderNotificationDismissals(
  userId: string,
  activePendingIds: Set<string>,
  activeAttentionIds: Set<string>
): void {
  const u = getUser(userId);
  let changed = false;
  for (const id of Object.keys(u.pending)) {
    if (!activePendingIds.has(id)) {
      delete u.pending[id];
      changed = true;
    }
  }
  for (const id of Object.keys(u.attention)) {
    if (!activeAttentionIds.has(id)) {
      delete u.attention[id];
      changed = true;
    }
  }
  if (changed) saveUser(userId, u);
}

export function isPendingNotificationDismissed(userId: string, requestId: string): boolean {
  return Boolean(getUser(userId).pending[requestId]);
}

export function isAttentionNotificationDismissed(userId: string, requestId: string): boolean {
  return Boolean(getUser(userId).attention[requestId]);
}

export function dismissPendingNotification(userId: string, requestId: string): void {
  const u = getUser(userId);
  u.pending[requestId] = new Date().toISOString();
  saveUser(userId, u);
}

export function dismissAttentionNotification(userId: string, requestId: string): void {
  const u = getUser(userId);
  u.attention[requestId] = new Date().toISOString();
  saveUser(userId, u);
}

export function getRegistrationSeenCount(userId: string): number {
  return getUser(userId).registrationSeenCount;
}

export function markRegistrationNotificationsSeen(userId: string, currentPendingCount: number): void {
  const u = getUser(userId);
  u.registrationSeenCount = Math.max(0, currentPendingCount);
  saveUser(userId, u);
}
