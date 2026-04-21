import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { CenteredAlert } from '@/components/CenteredAlert';
import { RequestCard } from '@/components/request-card';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { collegeAdminAPI } from '@/lib/collegeAdminApi';
import { requestsAPI } from '@/lib/requestsApi';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfileRole } from '@/hooks/use-profile-role';
import type { RequestWithRelations } from '@/types/requests';
import {
  supabase,
  isPersistedSessionAuthFailure,
  clearPersistedAuthSession,
} from '@/lib/supabase';

/** Includes Received — once goods are received, the request is complete for department users. */
const HISTORY_STATUSES = new Set(['Received', 'Completed', 'Rejected', 'ProcurementFailed']);

export default function RequestHistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { role } = useProfileRole();
  const isDeptHead = role === 'DeptHead';

  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  const loadCollegeRequests = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        if (isPersistedSessionAuthFailure(authError)) await clearPersistedAuthSession();
        setSignedIn(false);
        setRequests([]);
        setError('Your session expired. Please sign in again.');
        return;
      }
      setSignedIn(!!user);
      if (!user) {
        setRequests([]);
        return;
      }
      const data = await collegeAdminAPI.getRequestHistory();
      setRequests(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load request history');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFacultyHistory = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        if (isPersistedSessionAuthFailure(authError)) await clearPersistedAuthSession();
        setSignedIn(false);
        setRequests([]);
        setError('Your session expired. Please sign in again.');
        return;
      }
      setSignedIn(!!user);
      if (!user) {
        setRequests([]);
        return;
      }
      const all = await requestsAPI.getMyRequests();
      const history = all.filter((r) => HISTORY_STATUSES.has(r.status));
      setRequests(history);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isDeptHead) loadCollegeRequests();
    else loadFacultyHistory();
  }, [isDeptHead]);

  const onRefresh = () => {
    setRefreshing(true);
    if (isDeptHead) void loadCollegeRequests();
    else void loadFacultyHistory();
  };

  const handleAlertRetry = async () => {
    setRetryLoading(true);
    setRefreshing(true);
    try {
      if (isDeptHead) await loadCollegeRequests();
      else await loadFacultyHistory();
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
        headerImage={
          <Image
            source={require('@/assets/images/wmsu1.jpg')}
            style={styles.wmsuLogo}
            contentFit="cover"
          />
        }>
        <ThemedView style={styles.centerBox}>
          <ThemedText type="subtitle">Sign in to see your request history</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

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
        <ThemedText type="title">{isDeptHead ? 'College requests' : 'History'}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {isDeptHead
            ? 'All requests from departments in your college'
            : 'Received, completed, rejected, and procurement-failed requests'}
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
      {loading ? (
        <ThemedView style={styles.centerBox}>
          <ActivityIndicator size="large" color={c.tint} />
          <ThemedText style={styles.loadingText}>{isDeptHead ? 'Loading college requests…' : 'Loading history…'}</ThemedText>
        </ThemedView>
      ) : requests.length === 0 ? (
        <ThemedView style={styles.centerBox}>
          <ThemedText type="subtitle">{isDeptHead ? 'No requests yet' : 'No history yet'}</ThemedText>
          <ThemedText style={styles.hint}>Drag down from the top of the page to refresh.</ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.listContent}>
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} colors={c} />
          ))}
        </View>
      )}
    </ParallaxScrollView>
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
});
