import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { WMSU } from '@/constants/theme';
import { awardeesAPI } from '@/lib/awardeesApi';

function formatDate(s: string | null): string {
  if (!s?.trim()) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BidWinnersAwardeesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [awardees, setAwardees] = useState<Awaited<ReturnType<typeof awardeesAPI.getAwardees>>>([]);
  const [loading, setLoading] = useState(true);
  const [processExpanded, setProcessExpanded] = useState(false);

  useEffect(() => {
    awardeesAPI.getAwardees().then(setAwardees).catch(() => setAwardees([])).finally(() => setLoading(false));
  }, []);

  const isLight = colorScheme === 'light';
  const textPrimary = isLight ? '#11181C' : '#ECEDEE';
  const textSecondary = isLight ? '#6b7280' : '#9BA1A6';
  const cardBg = isLight ? '#FFFFFF' : '#252525';
  const borderColor = isLight ? '#E5E5E5' : '#333';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isLight ? '#F9FAFB' : '#1A1A1A' }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/login')} style={styles.loginBtn}>
          <Text style={styles.loginText}>Log in</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: textPrimary }]}>Bid Winners & Awardees</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          PMR — How the Bids and Awards Committee (BAC) selects the winning bid and who was awarded.
        </Text>

        <Pressable
          onPress={() => setProcessExpanded((v) => !v)}
          style={[styles.processHeader, { backgroundColor: isLight ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.2)', borderColor }]}
        >
          <Text style={[styles.processTitle, { color: textPrimary }]}>How WMSU selects the winning bid</Text>
          <MaterialIcons name={processExpanded ? 'expand-less' : 'expand-more'} size={28} color={textSecondary} />
        </Pressable>
        {processExpanded && (
          <View style={[styles.processBody, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <MaterialIcons name="check-circle" size={22} color={WMSU.red} />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: textPrimary }]}>1. Pass/Fail filter (quality first)</Text>
                <Text style={[styles.stepText, { color: textSecondary }]}>
                  The BAC opens the Technical Envelope. Only vendors who meet or exceed the minimum quality move to the next round.
                </Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <MaterialIcons name="format-list-numbered" size={22} color={WMSU.red} />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: textPrimary }]}>2. Price ranking</Text>
                <Text style={[styles.stepText, { color: textSecondary }]}>
                  The Financial Envelope is opened. Vendors are ranked from lowest to highest price. The lowest is the LCB (Lowest Calculated Bid).
                </Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <MaterialIcons name="verified" size={22} color={WMSU.red} />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: textPrimary }]}>3. Post-qualification</Text>
                <Text style={[styles.stepText, { color: textSecondary }]}>
                  The LCB vendor is verified (legal, technical, financial). If they pass, they are the LCRB—Lowest Calculated Responsive Bid—and win the contract.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.awardeesSection, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.awardeesHeader}>
            <MaterialIcons name="emoji-events" size={24} color={WMSU.red} />
            <Text style={[styles.awardeesTitle, { color: textPrimary }]}>Awardees</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={WMSU.red} style={styles.loader} />
          ) : awardees.length === 0 ? (
            <Text style={[styles.empty, { color: textSecondary }]}>No awarded contracts to display yet.</Text>
          ) : (
            <View style={styles.table}>
              {awardees.map((row) => (
                <View key={row.id} style={[styles.row, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.cellTitle, { color: textPrimary }]}>{row.item_name}</Text>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.cell, { color: textSecondary }]}>₱{Number(row.total_price).toLocaleString()}</Text>
                    <Text style={[styles.cell, { color: textSecondary }]}>{row.supplier?.name ?? '—'}</Text>
                    <Text style={[styles.cell, { color: textSecondary }]}>{formatDate(row.approved_at)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: row.status === 'Completed' ? '#DCFCE7' : '#FEF3C7' }]}>
                      <Text style={styles.statusText}>{row.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WMSU.red,
    borderBottomWidth: 1,
    borderBottomColor: WMSU.redDark || '#6B0000',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: '#FFFFFF', fontSize: 16 },
  loginBtn: { paddingVertical: 8, paddingHorizontal: 12, paddingRight: 16 },
  loginText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  processHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  processTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  processBody: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(139,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  stepText: { fontSize: 14, lineHeight: 20 },
  awardeesSection: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  awardeesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  awardeesTitle: { fontSize: 20, fontWeight: '700' },
  loader: { marginVertical: 24 },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 15 },
  table: {},
  row: { padding: 16, borderBottomWidth: 1 },
  cellTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  cell: { fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
});
