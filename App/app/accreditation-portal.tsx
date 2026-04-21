import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CenteredAlert } from '@/components/CenteredAlert';
import { WMSU } from '@/constants/theme';
import { suppliersAPI } from '@/lib/suppliersApi';
import type { Supplier } from '@/types/suppliers';

export default function AccreditationPortalScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    suppliersAPI.getAll().then(setSuppliers).catch((e) => setError(e?.message || 'Failed to load')).finally(() => setLoading(false));
  }, []);

  const qualified = suppliers.filter((s) => s.status === 'Qualified');
  const disqualified = suppliers.filter((s) => s.status === 'Disqualified');
  const isLight = colorScheme === 'light';
  const textPrimary = isLight ? '#11181C' : '#ECEDEE';
  const textSecondary = isLight ? '#6b7280' : '#9BA1A6';
  const cardBg = isLight ? '#FFFFFF' : '#252525';
  const borderColor = isLight ? '#E5E5E5' : '#333';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isLight ? '#F9FAFB' : '#1A1A1A' }]} edges={['top']}>
      <CenteredAlert
        visible={!!error}
        message={error}
        type="error"
        onClose={() => setError('')}
        actionLabel="Retry"
        onAction={() => { setError(''); setLoading(true); suppliersAPI.getAll().then(setSuppliers).catch((e) => setError(e?.message || 'Failed to load')).finally(() => setLoading(false)); }}
      />
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
            <MaterialIcons name="verified-user" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: textPrimary }]}>Accreditation Portal</Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              View qualified and disqualified suppliers. No login required.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={WMSU.red} style={styles.loader} />
        ) : (
          <>
            <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.sectionHeader, { backgroundColor: isLight ? '#DCFCE7' : 'rgba(34,197,94,0.2)' }]}>
                <MaterialIcons name="check-circle" size={22} color="#16A34A" />
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Qualified suppliers</Text>
              </View>
              <View style={styles.sectionBody}>
                <Text style={[styles.sectionCount, { color: textSecondary }]}>
                  {qualified.length} supplier{qualified.length !== 1 ? 's' : ''} accredited to participate.
                </Text>
                {qualified.length === 0 ? (
                  <Text style={[styles.empty, { color: textSecondary }]}>No qualified suppliers yet.</Text>
                ) : (
                  qualified.map((s) => (
                    <SupplierCard key={s.id} supplier={s} status="Qualified" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                  ))
                )}
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.sectionHeader, { backgroundColor: isLight ? '#FEE2E2' : 'rgba(185,28,28,0.2)' }]}>
                <MaterialIcons name="cancel" size={22} color="#B91C1C" />
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Disqualified suppliers</Text>
              </View>
              <View style={styles.sectionBody}>
                <Text style={[styles.sectionCount, { color: textSecondary }]}>
                  {disqualified.length} supplier{disqualified.length !== 1 ? 's' : ''} not accredited.
                </Text>
                {disqualified.length === 0 ? (
                  <Text style={[styles.empty, { color: textSecondary }]}>No disqualified suppliers.</Text>
                ) : (
                  disqualified.map((s) => (
                    <SupplierCard key={s.id} supplier={s} status="Disqualified" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SupplierCard({
  supplier,
  status,
  textPrimary,
  textSecondary,
  borderColor,
}: {
  supplier: Supplier;
  status: 'Qualified' | 'Disqualified';
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}) {
  const isQualified = status === 'Qualified';
  return (
    <View style={[styles.supplierCard, { borderColor }]}>
      {supplier.image_url ? (
        <Image source={{ uri: supplier.image_url }} style={styles.supplierImg} />
      ) : (
        <View style={styles.supplierImgPlaceholder}>
          <MaterialIcons name="business" size={28} color={textSecondary} />
        </View>
      )}
      <View style={styles.supplierBody}>
        <View style={styles.supplierRow}>
          <Text style={[styles.supplierName, { color: textPrimary }]}>{supplier.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isQualified ? '#DCFCE7' : '#FEE2E2' }]}>
            <Text style={[styles.statusText, { color: isQualified ? '#16A34A' : '#B91C1C' }]}>{status}</Text>
          </View>
        </View>
        {supplier.category ? <Text style={[styles.supplierCategory, { color: textSecondary }]}>{supplier.category}</Text> : null}
        <View style={styles.contactRow}>
          {supplier.contact_person && (
            <Text style={[styles.contact, { color: textSecondary }]}>👤 {supplier.contact_person}</Text>
          )}
          {supplier.contact_number && (
            <Pressable onPress={() => Linking.openURL(`tel:${supplier.contact_number}`)}>
              <Text style={[styles.link, { color: WMSU.red }]}>📞 {supplier.contact_number}</Text>
            </Pressable>
          )}
          {supplier.email && (
            <Pressable onPress={() => Linking.openURL(`mailto:${supplier.email}`)}>
              <Text style={[styles.link, { color: WMSU.red }]}>✉ {supplier.email}</Text>
            </Pressable>
          )}
        </View>
        {supplier.address ? (
          <Text style={[styles.address, { color: textSecondary }]} numberOfLines={2}>📍 {supplier.address}</Text>
        ) : null}
      </View>
    </View>
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
  iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: WMSU.red, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  errorBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  errorText: { color: '#B91C1C', fontSize: 14 },
  loader: { marginTop: 32 },
  section: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  sectionBody: { padding: 16 },
  sectionCount: { fontSize: 14, marginBottom: 12 },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: 14 },
  supplierCard: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  supplierImg: { width: 56, height: 56, borderRadius: 8 },
  supplierImgPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  supplierBody: { flex: 1, minWidth: 0 },
  supplierRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  supplierName: { fontSize: 16, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  supplierCategory: { fontSize: 14, marginBottom: 6 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  contact: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '600' },
  address: { fontSize: 13 },
});
