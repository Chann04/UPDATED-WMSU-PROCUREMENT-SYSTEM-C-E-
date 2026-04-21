import { StyleSheet, Text, View } from 'react-native';
import type { RequestStatus } from '@/types/requests';

const statusColors: Record<RequestStatus, { bg: string; text: string }> = {
  Draft: { bg: '#E2E8F0', text: '#475569' },
  Pending: { bg: '#FEF3C7', text: '#B45309' },
  Negotiating: { bg: '#FEF9C3', text: '#A16207' },
  Approved: { bg: '#D1FAE5', text: '#047857' },
  Rejected: { bg: '#FEE2E2', text: '#B91C1C' },
  ProcurementFailed: { bg: '#FEE2E2', text: '#B91C1C' },
  Ordered: { bg: '#EDE9FE', text: '#6D28D9' },
  Procuring: { bg: '#E0E7FF', text: '#4338CA' },
  ProcurementDone: { bg: '#DDD6FE', text: '#5B21B6' },
  Received: { bg: '#DBEAFE', text: '#1D4ED8' },
  Completed: { bg: '#DCFCE7', text: '#15803D' },
};

interface StatusBadgeProps {
  status: RequestStatus | string;
}

const normalizedStatus = (s: string) =>
  (s || '').trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = String(status ?? '').trim();
  if (s in statusColors) {
    const config = statusColors[s as RequestStatus];
    return (
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.text, { color: config.text }]}>{s}</Text>
      </View>
    );
  }
  const raw = normalizedStatus(status) as RequestStatus;
  // App progress uses 4 lifecycle stages; map legacy states to nearest stage for display.
  const key: RequestStatus =
    raw === 'Negotiating'
      ? 'Pending'
      : raw === 'Ordered'
      ? 'Approved'
      : raw === 'Completed'
      ? 'Received'
      : raw;
  const config = statusColors[key] ?? statusColors.Draft;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{key || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
