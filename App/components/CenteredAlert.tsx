import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  /** When true, Retry shows a spinner and actions are disabled (use while refetching). */
  actionLoading?: boolean;
};

export function CenteredAlert({
  visible,
  message,
  type,
  onClose,
  actionLabel,
  onAction,
  actionLoading,
}: Props) {
  const isError = type === 'error';
  const bg = isError ? '#FEE2E2' : '#D1FAE5';
  const textColor = isError ? '#B91C1C' : '#047857';
  const borderColor = isError ? '#FECACA' : '#A7F3D0';
  const busy = !!actionLoading;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
      <Pressable style={styles.overlay} onPress={busy ? undefined : onClose}>
        <Pressable style={[styles.box, { backgroundColor: bg, borderColor }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.message, { color: textColor }]}>{message}</Text>
          <View style={styles.actions}>
            {actionLabel && onAction && (
              <Pressable
                disabled={busy}
                onPress={() => void onAction()}
                style={[styles.button, isError && styles.buttonError, busy && styles.buttonDisabled]}
              >
                {busy ? (
                  <View style={styles.retryInner}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.buttonText, isError && styles.buttonTextError]}>{actionLabel}</Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, isError && styles.buttonTextError]}>{actionLabel}</Text>
                )}
              </Pressable>
            )}
            <Pressable disabled={busy} onPress={onClose} style={styles.dismiss}>
              <Text style={[styles.dismissText, { color: textColor }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#8B0000',
  },
  buttonError: {
    backgroundColor: '#B91C1C',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextError: {
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.85,
  },
  retryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dismiss: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
