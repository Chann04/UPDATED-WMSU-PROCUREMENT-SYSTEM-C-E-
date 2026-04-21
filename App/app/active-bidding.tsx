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
import { landingAPI } from '@/lib/landingApi';
import type { TransparencyFeaturedItem } from '@/types/landing';

type BiddingItem = {
  projectTitle: string;
  abc: number;
  referenceNo: string;
  closingDate: string;
  openingDate?: string;
  location?: string;
  description?: string;
  status?: string;
};

function formatDate(s: string): string {
  if (!s?.trim()) return s || '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toItem(f: TransparencyFeaturedItem): BiddingItem {
  return {
    projectTitle: f.projectTitle || '—',
    abc: typeof f.abc === 'number' && !Number.isNaN(f.abc) ? f.abc : 0,
    referenceNo: f.referenceNo || '—',
    closingDate: f.closingDate || '',
    openingDate: f.openingDate,
    location: f.location,
    description: f.description,
    status: f.status ?? 'Active',
  };
}

export default function ActiveBiddingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [items, setItems] = useState<BiddingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    landingAPI
      .getAll()
      .then((content) => {
        if (cancelled) return;
        const list: BiddingItem[] = [];
        const t = content.transparency;
        const entries =
          Array.isArray(t?.items) && t.items.length > 0
            ? t.items
            : t?.featuredItem
              ? [{ featuredItem: t.featuredItem }]
              : [];
        entries.forEach((e) => {
          const f = e?.featuredItem;
          if (!f?.projectTitle) return;
          const status = (f.status ?? 'Active').trim().toLowerCase();
          if (status !== 'active') return;
          list.push(toItem(f));
        });
        setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLight = colorScheme === 'light';
  const textPrimary = isLight ? '#11181C' : '#ECEDEE';
  const textSecondary = isLight ? '#6b7280' : '#9BA1A6';
  const cardBg = isLight ? '#FFFFFF' : '#252525';
  const borderColor = isLight ? '#E5E5E5' : '#333';
  const selected = selectedIndex !== null ? items[selectedIndex] : null;

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
            <MaterialIcons name="gavel" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: textPrimary }]}>Active Bidding</Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              View current active bidding opportunities and submit your bids.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={WMSU.red} style={styles.loader} />
        ) : items.length === 0 ? (
          <Text style={[styles.empty, { color: textSecondary }]}>No active bidding opportunities at this time.</Text>
        ) : (
          <View style={styles.list}>
            {items.map((item, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedIndex(selectedIndex === index ? null : index)}
                style={[
                  styles.card,
                  { backgroundColor: cardBg, borderColor },
                  selectedIndex === index && styles.cardSelected,
                ]}
              >
                <View style={styles.cardRow}>
                  <Text style={[styles.cardTitle, { color: textPrimary }]} numberOfLines={2}>
                    {item.projectTitle}
                  </Text>
                  <MaterialIcons
                    name={selectedIndex === index ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={textSecondary}
                  />
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: textSecondary }]}>Ref: {item.referenceNo}</Text>
                  <Text style={[styles.meta, { color: textSecondary }]}>₱{item.abc.toLocaleString()}</Text>
                  <Text style={[styles.meta, { color: textSecondary }]}>Closes: {formatDate(item.closingDate)}</Text>
                </View>
                {selectedIndex === index && (
                  <View style={[styles.detail, { borderTopColor: borderColor }]}>
                    {item.description ? (
                      <Text style={[styles.detailText, { color: textSecondary }]}>{item.description}</Text>
                    ) : null}
                    {item.location ? (
                      <Text style={[styles.detailText, { color: textSecondary }]}>Location: {item.location}</Text>
                    ) : null}
                    {item.contactPerson && (
                      <Text style={[styles.detailText, { color: textSecondary }]}>Contact: {item.contactPerson}</Text>
                    )}
                  </View>
                )}
              </Pressable>
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
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: WMSU.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  loader: { marginTop: 32 },
  empty: { textAlign: 'center', paddingVertical: 32, fontSize: 15 },
  list: { gap: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 2 },
  cardSelected: { borderColor: WMSU.red },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  meta: { fontSize: 13 },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  detailText: { fontSize: 14, marginBottom: 4 },
});
