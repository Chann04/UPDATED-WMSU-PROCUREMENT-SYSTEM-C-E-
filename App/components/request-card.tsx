import { StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { ThemedText } from '@/components/themed-text';
import type { RequestWithRelations } from '@/types/requests';

type ThemeColors = { card: string; border: string; text: string };

export function RequestCard({
  request,
  colors,
}: {
  request: RequestWithRelations;
  colors: ThemeColors;
}) {
  const created = new Date(request.created_at).toLocaleDateString();
  const timeline: string[] = [`Created: ${created}`];
  if (request.approved_at)
    timeline.push(`Reviewed: ${new Date(request.approved_at).toLocaleDateString()}`);
  if (request.received_at)
    timeline.push(`Received: ${new Date(request.received_at).toLocaleDateString()}`);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardRow}>
        <ThemedText type="defaultSemiBold" style={styles.itemName} numberOfLines={2}>
          {request.item_name}
        </ThemedText>
        <StatusBadge status={request.status} />
      </View>
      <View style={styles.metaRow}>
        <ThemedText style={styles.meta}>{request.category?.name ?? '—'}</ThemedText>
        <ThemedText style={styles.meta}>Qty: {request.quantity}</ThemedText>
        <ThemedText style={styles.meta}>₱{request.total_price?.toLocaleString() ?? '0'}</ThemedText>
      </View>
      {request.description ? (
        <ThemedText style={styles.desc} numberOfLines={2}>
          {request.description}
        </ThemedText>
      ) : null}
      {(request.status === 'Rejected' || request.status === 'ProcurementFailed') && request.rejection_reason ? (
        <View style={styles.rejectionBox}>
          <ThemedText style={styles.rejectionLabel}>
            {request.status === 'ProcurementFailed' ? 'Failure reason:' : 'Rejection reason:'}
          </ThemedText>
          <ThemedText style={styles.rejectionText}>{request.rejection_reason}</ThemedText>
        </View>
      ) : null}
      <View style={styles.timeline}>
        <ThemedText style={styles.timelineText}>{timeline.join(' · ')}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  meta: {
    fontSize: 13,
    opacity: 0.9,
  },
  desc: {
    fontSize: 13,
    marginTop: 6,
    opacity: 0.85,
  },
  rejectionBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(185, 28, 28, 0.1)',
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 12,
  },
  timeline: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  timelineText: {
    fontSize: 11,
    opacity: 0.7,
  },
});
