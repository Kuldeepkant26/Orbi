import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useCall } from '../context/CallContext';

/**
 * IncomingCallScreen
 *
 * This screen is shown as a full-screen modal overlay whenever someone
 * calls us. It shows the caller's name and two buttons: Accept and Decline.
 *
 * Navigation to this screen is handled in App.tsx by watching callStatus.
 */
export default function IncomingCallScreen() {
  const { caller, answerCall, rejectCall } = useCall();

  // Pulsing animation on the avatar ring to indicate an active incoming call
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const initial = caller?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      {/* Background gradient-like overlay */}
      <View style={styles.overlay} />

      {/* Caller info */}
      <View style={styles.content}>
        <Text style={styles.incomingLabel}>Incoming Video Call</Text>

        {/* Pulsing avatar */}
        <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulse }] }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </Animated.View>

        <Text style={styles.callerName}>{caller?.name ?? 'Someone'}</Text>
        <Text style={styles.callerSub}>is calling you…</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Decline */}
        <View style={styles.actionItem}>
          <TouchableOpacity style={styles.declineBtn} onPress={rejectCall}>
            <Text style={styles.btnIcon}>📵</Text>
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Decline</Text>
        </View>

        {/* Accept */}
        <View style={styles.actionItem}>
          <TouchableOpacity style={styles.acceptBtn} onPress={answerCall}>
            <Text style={styles.btnIcon}>📹</Text>
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Accept</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    opacity: 0.97,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  incomingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 40,
  },
  // ── Pulsing avatar ring ──────────────────────────────────────────────────────
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(79, 70, 229, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '700',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  callerSub: {
    fontSize: 16,
    color: '#64748B',
  },
  // ── Action buttons ───────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '70%',
  },
  actionItem: {
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 8,
  },
  declineBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnIcon: {
    fontSize: 28,
  },
});
