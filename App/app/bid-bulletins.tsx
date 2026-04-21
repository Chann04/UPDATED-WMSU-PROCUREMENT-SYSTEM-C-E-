import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { WMSU } from '@/constants/theme';
import { bidBulletinsAPI } from '@/lib/bidBulletinsApi';
import type { BidBulletin } from '@/types/bidBulletins';

function formatDate(s: string): string {
  if (!s?.trim()) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const FILTERS = ['All', 'Bulletins', 'Supplemental', 'Notice'];

export default function BidBulletinsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [bulletins, setBulletins] = useState<BidBulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    bidBulletinsAPI.getAll().then(setBulletins).catch(() => setBulletins([])).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? bulletins : bulletins.filter((b) => b.type === filter);
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
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="description" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: textPrimary }]}>Supplemental / Bid Bulletins</Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              Access bid bulletins, supplements, and updates for ongoing procurements.
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterBtn, { borderColor, backgroundColor: filter === f ? WMSU.red : cardBg }]}
            >
              <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textPrimary }]}>{f}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={WMSU.red} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <Text style={[styles.empty, { color: textSecondary }]}>No bulletins in this category.</Text>
        ) : (
          <View style={styles.list}>
            {filtered.map((b) => (
              <View key={b.id} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <Pressable
                  onPress={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  style={styles.cardHeader}
                >
                  <View style={styles.cardTitleRow}>
                    <View style={[styles.typeBadge, { backgroundColor: b.type === 'Supplemental' ? '#FED7AA' : b.type === 'Notice' ? '#BFDBFE' : '#E5E7EB' }]}>
                      <Text style={styles.typeText}>{b.type}</Text>
                    </View>
                    <Text style={[styles.cardTitle, { color: textPrimary }]} numberOfLines={2}>{b.title}</Text>
                    <Text style={[styles.meta, { color: textSecondary }]}>{b.referenceNo} · {formatDate(b.date)}</Text>
                  </View>
                  <MaterialIcons name={expandedId === b.id ? 'expand-less' : 'expand-more'} size={24} color={textSecondary} />
                </Pressable>
                {expandedId === b.id && (
                  <View style={[styles.detail, { borderTopColor: borderColor }]}>
                    {b.description ? <Text style={[styles.detailText, { color: textSecondary }]}>{b.description}</Text> : null}
                    {b.relatedTo ? <Text style={[styles.detailText, { color: textSecondary }]}>Related: {b.relatedTo}</Text> : null}
                    {b.attachments?.length > 0 && (
                      <View style={styles.attachments}>
                        {b.attachments.map((att, i) => (
                          <Pressable key={i} onPress={() => att.url && Linking.openURL(att.url)} style={styles.attachRow}>
                            <MaterialIcons name="attach-file" size={20} color={WMSU.red} />
                            <Text style={[styles.attachText, { color: WMSU.red }]}>{att.name || 'Download'}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
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
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: WMSU.red, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  filterText: { fontSize: 14, fontWeight: '600' },
  loader: { marginTop: 32 },
  empty: { textAlign: 'center', paddingVertical: 32, fontSize: 15 },
  list: { gap: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitleRow: { flex: 1 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 6 },
  typeText: { fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 13 },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  detailText: { fontSize: 14, marginBottom: 6 },
  attachments: { marginTop: 8, gap: 8 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachText: { fontSize: 14, fontWeight: '600' },
});
