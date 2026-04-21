import type { User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '../types/database';

/** Human-readable role names (DB / code still use Admin, DeptHead, Faculty). */
export const ROLE_LABELS: Record<UserRole, string> = {
  Admin: 'WMSU Admin',
  DeptHead: 'College Admin',
  Faculty: 'Department',
};

/** Display string for a canonical role (use for UI only; routing uses `UserRole`). */
export function formatRoleLabel(role: UserRole | null | undefined): string {
  if (role == null) return '—';
  return ROLE_LABELS[role] ?? String(role);
}

/** Map any DB / JWT string to canonical `UserRole` (fixes `admin` vs `Admin`, stray spaces, etc.). */
export function normalizeUserRole(raw: string | null | undefined): UserRole {
  const s = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (s === 'admin' || s === 'administrator' || s === 'wmsu admin' || s === 'wmsu_admin') return 'Admin';
  if (
    s === 'depthead' ||
    s === 'dept head' ||
    s === 'dept_head' ||
    s === 'college admin' ||
    s === 'college_admin'
  ) {
    return 'DeptHead';
  }
  if (s === 'faculty' || s === '' || s === 'department') return 'Faculty';
  // Unknown values: default to Faculty for legacy rows; explicit admin strings handled above
  return 'Faculty';
}

export function jwtSaysAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const app = user.app_metadata as Record<string, unknown> | undefined;
  const candidates = [meta?.role, meta?.user_role, app?.role, app?.user_role];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const t = c.trim().toLowerCase();
    if (t === 'admin' || t === 'administrator' || t === 'wmsu admin' || t === 'wmsu_admin') return true;
  }
  return false;
}

export function jwtSaysFaculty(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const app = user.app_metadata as Record<string, unknown> | undefined;
  const candidates = [meta?.role, meta?.user_role, app?.role, app?.user_role];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const t = c.trim().toLowerCase();
    if (t === 'faculty' || t === 'department') return true;
  }
  return false;
}

/** Admin from normalized `profiles.role` or JWT metadata. */
export function isAdminRole(profile: Profile | null | undefined, user: User | null | undefined): boolean {
  if (normalizeUserRole(profile?.role) === 'Admin') return true;
  return jwtSaysAdmin(user);
}

export function isDeptHeadRole(profile: Profile | null | undefined): boolean {
  return normalizeUserRole(profile?.role) === 'DeptHead';
}

export function isDeptHeadUser(profile: Profile | null | undefined): boolean {
  return normalizeUserRole(profile?.role) === 'DeptHead';
}

export function isFacultyRole(profile: Profile | null | undefined): boolean {
  return normalizeUserRole(profile?.role) === 'Faculty';
}

/**
 * Full-page spinner on /faculty while profiles row loads — except when JWT already says
 * faculty (not admin), so refresh feels instant for typical faculty accounts.
 */
export function shouldBlockFacultyRouteForProfileLoading(
  profile: Profile | null | undefined,
  user: User | null | undefined,
  profileLoading: boolean
): boolean {
  if (!profileLoading || !user) return false;
  if (profile != null) return false;
  return true;
}

/** Faculty end-user for routing (profile and/or JWT); excludes Admin/DeptHead. */
export function isFacultyUser(profile: Profile | null | undefined, user: User | null | undefined): boolean {
  if (isAdminRole(profile, user)) return false;
  if (normalizeUserRole(profile?.role) === 'DeptHead') return false;
  if (profile != null && normalizeUserRole(profile.role) === 'Faculty') return true;
  return false;
}
