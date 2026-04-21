import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { CenteredAlert } from '@/components/CenteredAlert';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { collegeAdminAPI, type CollegeBudgetSummary } from '@/lib/collegeAdminApi';
import { requestsAPI } from '@/lib/requestsApi';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfileRole } from '@/hooks/use-profile-role';
import { RequestCard } from '@/components/request-card';
import type { RequestWithRelations } from '@/types/requests';
import {
  supabase,
  isPersistedSessionAuthFailure,
  clearPersistedAuthSession,
} from '@/lib/supabase';

/** Active pipeline only — "Received" is treated as complete and listed under History. */
const IN_PROGRESS_STATUSES = new Set([
  'Draft',
  'Pending',
  'Approved',
  'Procuring',
  'ProcurementDone',
]);

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { role } = useProfileRole();
  const isDeptHead = role === 'DeptHead';

  const [budget, setBudget] = useState<CollegeBudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const [progressRequests, setProgressRequests] = useState<RequestWithRelations[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(!isDeptHead);
  const [retryLoading, setRetryLoading] = useState(false);

  const loadFacultyProgress = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        if (isPersistedSessionAuthFailure(authError)) await clearPersistedAuthSession();
        setSignedIn(false);
        setProgressRequests([]);
        setError('Your session expired. Please sign in again.');
        return;
      }
      setSignedIn(!!user);
      if (!user) {
        setProgressRequests([]);
        return;
      }
      const all = await requestsAPI.getMyRequests();
      const inProgress = all.filter((r) => IN_PROGRESS_STATUSES.has(r.status));
      setProgressRequests(inProgress);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
      setProgressRequests([]);
    } finally {
      setFacultyLoading(false);
      setRefreshing(false);
    }
  };

  const loadRequests = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        if (isPersistedSessionAuthFailure(authError)) await clearPersistedAuthSession();
        setSignedIn(false);
        setBudget(null);
        setError('Your session expired. Please sign in again.');
        return;
      }
      setSignedIn(!!user);
      if (!user) {
        setBudget(null);
        return;
      }
      const data = await collegeAdminAPI.getBudgetSummary();
      setBudget(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load budget');
      setBudget(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isDeptHead) {
      loadRequests();
    } else {
      loadFacultyProgress();
    }
  }, [isDeptHead]);

  // Auto-refresh every 10s so view-only cards stay current
  useEffect(() => {
    if (!signedIn) return;
    const interval = setInterval(() => {
      if (isDeptHead) loadRequests();
      else loadFacultyProgress();
    }, 10_000);
    return () => clearInterval(interval);
  }, [signedIn, isDeptHead]);

  const onRefresh = () => {
    setRefreshing(true);
    if (isDeptHead) void loadRequests();
    else void loadFacultyProgress();
  };

  const handleAlertRetry = async () => {
    setRetryLoading(true);
    setRefreshing(true);
    try {
      if (isDeptHead) await loadRequests();
      else await loadFacultyProgress();
    } finally {
      setRetryLoading(false);
    }
  };

  const c = Colors[colorScheme];

  if (signedIn === false) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{
          light: Colors.light.headerBg,
          dark: Colors.dark.headerBg,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.tint} />}
        headerImage={
          <Image
            source={require('@/assets/images/wmsu1.jpg')}
            style={styles.wmsuLogo}
            contentFit="cover"
          />
        }>
        <ThemedView style={styles.centerBox}>
          <ThemedText type="subtitle">Sign in to see your requests</ThemedText>
          <ThemedText style={styles.hint}>
            Use the same account as the procurement web app. Sign in there first, or add login to this app.
          </ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (!isDeptHead) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{
          light: Colors.light.headerBg,
          dark: Colors.dark.headerBg,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.tint} />}
        headerImage={
          <Image
            source={require('@/assets/images/wmsu1.jpg')}
            style={styles.wmsuLogo}
            contentFit="cover"
          />
        }>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Request progress</ThemedText>
          <ThemedText style={styles.subtitle}>
            Your active procurement requests (before received / complete)
          </ThemedText>
        </ThemedView>
        <CenteredAlert
          visible={!!error}
          message={error || ''}
          type="error"
          onClose={() => setError(null)}
          actionLabel="Retry"
          actionLoading={retryLoading}
          onAction={handleAlertRetry}
        />
        {facultyLoading ? (
          <ThemedView style={styles.centerBox}>
            <ActivityIndicator size="large" color={c.tint} />
            <ThemedText style={styles.loadingText}>Loading requests…</ThemedText>
          </ThemedView>
        ) : progressRequests.length === 0 ? (
          <ThemedView style={styles.centerBox}>
            <ThemedText type="subtitle">No requests in progress</ThemedText>
            <ThemedText style={styles.hint}>
              Received, completed, and rejected requests are on the History tab.
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.listContent}>
            {progressRequests.map((req) => (
              <RequestCard key={req.id} request={req} colors={c} />
            ))}
          </View>
        )}
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{
        light: Colors.light.headerBg,
        dark: Colors.dark.headerBg,
      }}
      headerImage={
        <Image
          source={require('@/assets/images/wmsu1.jpg')}
          style={styles.wmsuLogo}
          contentFit="cover"
        />
      }>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Budget</ThemedText>
        <ThemedText style={styles.subtitle}>View-only college budget and budget types</ThemedText>
      </ThemedView>

      <CenteredAlert
        visible={!!error}
        message={error || ''}
        type="error"
        onClose={() => setError(null)}
        actionLabel="Retry"
        actionLoading={retryLoading}
        onAction={handleAlertRetry}
      />
      {loading ? (
        <ThemedView style={styles.centerBox}>
          <ActivityIndicator size="large" color={c.tint} />
          <ThemedText style={styles.loadingText}>Loading budget…</ThemedText>
        </ThemedView>
      ) : !budget ? (
        <ThemedView style={styles.centerBox}>
          <ThemedText type="subtitle">No budget data yet</ThemedText>
          <ThemedText style={styles.hint}>Drag down from the top of the page to refresh.</ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.listContent}>
          <BudgetSummary budget={budget} />
        </View>
      )}
    </ParallaxScrollView>
  );
}

function BudgetSummary({ budget }: { budget: CollegeBudgetSummary }) {
  return (
    <>
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statLabel}>College</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.statValue}>{budget.collegeName}</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statLabel}>Allocated budgets</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.statValue}>₱{budget.allocatedTotal.toLocaleString()}</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statLabel}>Unallocated budget</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.statValue}>₱{budget.unallocatedTotal.toLocaleString()}</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statLabel}>College total budget</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.statValue}>₱{budget.totalBudget.toLocaleString()}</ThemedText>
        </View>
      </View>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Budget types</ThemedText>
      <View style={styles.statGrid}>
        {budget.budgetTypes.length === 0 ? (
          <View style={styles.statCard}>
            <ThemedText style={styles.statLabel}>No budget types yet</ThemedText>
          </View>
        ) : (
          budget.budgetTypes.map((t) => (
            <View key={t.id} style={styles.statCard}>
              <ThemedText style={styles.statLabel}>{t.fundCode ? `${t.fundCode} - ${t.name}` : t.name}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>₱{t.remainingAmount.toLocaleString()}</ThemedText>
              <ThemedText style={styles.smallNote}>Original: ₱{t.amount.toLocaleString()} · Used: ₱{t.usedAmount.toLocaleString()}</ThemedText>
              <ThemedText style={styles.smallNote}>{t.isActive ? 'Active' : 'Inactive'}</ThemedText>
            </View>
          ))
        )}
      </View>
      <ThemedText style={styles.hint}>View-only. Pull down from top to refresh.</ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  wmsuLogo: {
    height: 160,
    width: 160,
    borderRadius: 80,
    bottom: 20,
    left: '50%',
    marginLeft: -80,
    position: 'absolute',
  },
  header: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  centerBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    marginTop: 8,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    opacity: 0.8,
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  statGrid: {
    gap: 12,
  },
  statCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 16,
  },
  smallNote: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
});
