import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { clearProfileRoleCache } from '@/hooks/use-profile-role';
import { CenteredAlert } from '@/components/CenteredAlert';
import { WMSU, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) {
        await supabase.auth.signOut();
        throw new Error('Authentication failed. Please try again.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Could not load your account. Please try again.');
      }

      if (profile.role === 'Admin') {
        await supabase.auth.signOut();
        setError('Admin accounts cannot use the mobile app. Please use the web portal.');
        return;
      }

      clearProfileRoleCache();
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setForgotPasswordLoading(true);
    setForgotPasswordSuccess(false);
    try {
      await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: 'mynewproject://reset-password',
      });
      setForgotPasswordSuccess(true);
      setForgotPasswordEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setError('');
    setForgotPasswordSuccess(false);
  };

  const isLight = colorScheme === 'light';
  const inputBg = isLight ? '#FFFFFF' : '#252525';
  const inputBorder = isLight ? WMSU.gray : '#333';
  const cardBg = isLight ? '#FFFFFF' : '#252525';
  const textPrimary = isLight ? '#0a0a0a' : '#ECEDEE';
  const textSecondary = isLight ? '#6b7280' : '#9BA1A6';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & branding – match web */}
        <View style={styles.logoSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to landing page"
            onPress={() => router.push('/landing')}
            style={({ pressed }) => [styles.logoPressable, pressed && styles.logoPressed]}
          >
            <Image
              source={require('@/assets/images/wmsu1.jpg')}
              style={styles.logo}
              contentFit="cover"
            />
          </Pressable>
          <Text style={[styles.title, { color: textPrimary }]}>
            Western Mindanao State University
          </Text>
          <Text style={[styles.subtitle, { color: textPrimary }]}>WMSU-Procurement</Text>
          <Text style={[styles.tagline, { color: textSecondary }]}>
            A Smart Research University by 2040
          </Text>
        </View>

        {/* Auth card – match web */}
        <CenteredAlert
          visible={!!error}
          message={error}
          type="error"
          onClose={() => setError('')}
        />
        <View style={[styles.card, { backgroundColor: cardBg, shadowColor: '#000' }]}>
          <Text style={[styles.welcomeTitle, { color: textPrimary }]}>Welcome Back</Text>

          <View style={styles.inputWrap}>
            <Text style={[styles.label, { color: textPrimary }]}>Email Address</Text>
            <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <MaterialIcons name="mail-outline" size={20} color={textSecondary} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: textPrimary }]}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputWrap}>
            <Text style={[styles.label, { color: textPrimary }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <MaterialIcons name="lock-outline" size={20} color={textSecondary} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={textSecondary}
                secureTextEntry
                style={[styles.input, { color: textPrimary }]}
                editable={!loading}
              />
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.signInButtonPressed,
              loading && styles.signInButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setShowForgotPassword(true);
              setError('');
              setForgotPasswordSuccess(false);
            }}
            style={styles.forgotLink}
          >
            <Text style={[styles.forgotLinkText, { color: textPrimary }]}>Forgot password</Text>
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: textSecondary }]}>
          Western Mindanao State University © 2025
        </Text>
      </ScrollView>

      {/* Forgot password modal – match web */}
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="fade"
        onRequestClose={closeForgotModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeForgotModal}>
          <Pressable style={[styles.modalCard, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Reset Password</Text>
              <Pressable onPress={closeForgotModal} style={styles.modalClose}>
                <MaterialIcons name="close" size={24} color={textSecondary} />
              </Pressable>
            </View>

            {forgotPasswordSuccess ? (
              <View style={styles.modalSuccess}>
                <View style={styles.successIconWrap}>
                  <MaterialIcons name="check-circle" size={48} color={WMSU.green} />
                </View>
                <Text style={[styles.successTitle, { color: textPrimary }]}>Email Sent!</Text>
                <Text style={[styles.successMessage, { color: textSecondary }]}>
                  We've sent a password reset link to your email. Check your inbox and follow the
                  instructions.
                </Text>
                <Pressable onPress={closeForgotModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={[styles.modalHint, { color: textSecondary }]}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>
                {error ? (
                  <View style={styles.errorBox}>
                    <MaterialIcons name="error-outline" size={20} color="#B91C1C" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: textPrimary }]}>Email Address</Text>
                  <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                    <MaterialIcons name="mail-outline" size={20} color={textSecondary} style={styles.inputIcon} />
                    <TextInput
                      value={forgotPasswordEmail}
                      onChangeText={setForgotPasswordEmail}
                      placeholder="Enter your email"
                      placeholderTextColor={textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[styles.input, { color: textPrimary }]}
                      editable={!forgotPasswordLoading}
                    />
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <Pressable onPress={closeForgotModal} style={[styles.cancelButton, { borderColor: inputBorder }]}>
                    <Text style={[styles.cancelButtonText, { color: textPrimary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleForgotPassword}
                    disabled={forgotPasswordLoading}
                    style={[styles.sendButton, forgotPasswordLoading && styles.signInButtonDisabled]}
                  >
                    {forgotPasswordLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.sendButtonText}>Send Reset Link</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoPressable: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 60,
  },
  logoPressed: {
    opacity: 0.88,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    borderRadius: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  tagline: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#B91C1C',
  },
  inputWrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    paddingRight: 8,
  },
  signInButton: {
    backgroundColor: WMSU.red,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  signInButtonPressed: {
    opacity: 0.9,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotLinkText: {
    fontSize: 14,
  },
  footer: {
    fontSize: 13,
    marginTop: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalHint: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalSuccess: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  successIconWrap: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: WMSU.red,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  sendButton: {
    flex: 1,
    backgroundColor: WMSU.red,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
