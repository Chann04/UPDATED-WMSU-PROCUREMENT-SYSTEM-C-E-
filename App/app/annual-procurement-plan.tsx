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
import type { AppPlannedItem } from '@/types/landing';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AnnualProcurementPlanScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [appItems, setAppItems] = useState<AppPlannedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    landingAPI
      .getAll()
      .then((content) => {
        if (cancelled) return;
        const items = content.planning?.appItems ?? [];
        setAppItems(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setAppItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const planned =
    selectedMonth !== null ? appItems.filter((i) => i.month === selectedMonth) : [];
  const isLight = colorScheme === 'light';
  const textPrimary = isLight ? '#11181C' : '#ECEDEE';
  const textSecondary = isLight ? '#6b7280' : '#9BA1A6';
  const cardBg = isLight ? '#FFFFFF' : '#252525';
  const borderColor = isLight ? '#E5E5E5' : '#333';
  const year = new Date().getFullYear();

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
        <Text style={[styles.title, { color: textPrimary }]}>Annual Procurement Plan (APP)</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Planned purchases from January to December. Select a month to view planned procurements.
        </Text>

        <Text style={[styles.schoolYear, { color: textPrimary }]}>
          School Year {year}-{year + 1}
        </Text>

        <View style={[styles.monthList, { backgroundColor: cardBg, borderColor }]}>
          {MONTHS.map((name, index) => (
            <View key={index} style={[styles.monthItem, { borderBottomColor: borderColor }]}>
              <Pressable
                onPress={() => setSelectedMonth(selectedMonth === index ? null : index)}
                style={styles.monthBtn}
              >
                <Text style={[styles.monthName, { color: textPrimary }]}>{name}</Text>
                <MaterialIcons
                  name={selectedMonth === index ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={textSecondary}
                />
              </Pressable>
              {selectedMonth === index && (
                <View style={[styles.plannedBox, { backgroundColor: isLight ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.2)', borderColor }]}>
                  {loading ? (
                    <ActivityIndicator size="small" color={WMSU.red} style={styles.loader} />
                  ) : planned.length === 0 ? (
                    <Text style={[styles.noItems, { color: textSecondary }]}>No planned purchases for this month.</Text>
                  ) : (
                    planned.map((item, i) => (
                      <View key={i} style={[styles.plannedCard, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.plannedTitle, { color: textPrimary }]}>{item.projectTitle}</Text>
                        {item.description ? (
                          <Text style={[styles.plannedDesc, { color: textSecondary }]}>{item.description}</Text>
                        ) : null}
                        <Text style={[styles.plannedBudget, { color: textPrimary }]}>
                          ₱{Number(item.budget).toLocaleString()}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          ))}
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
  schoolYear: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  monthList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  monthItem: { borderBottomWidth: 1 },
  monthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  monthName: { fontSize: 16, fontWeight: '600' },
  plannedBox: { padding: 16, borderTopWidth: 1 },
  loader: { marginVertical: 12 },
  noItems: { fontSize: 14, paddingVertical: 12 },
  plannedCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  plannedTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  plannedDesc: { fontSize: 14, marginBottom: 6 },
  plannedBudget: { fontSize: 15, fontWeight: '700' },
});
