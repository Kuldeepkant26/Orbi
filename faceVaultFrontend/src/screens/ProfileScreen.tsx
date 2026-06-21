import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  // Format "member since" date from user id (MongoDB ObjectId contains a timestamp)
  const memberSince = (() => {
    try {
      const ts = parseInt(user!.id.substring(0, 8), 16) * 1000;
      return new Date(ts).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  })();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>

      {/* Avatar + name */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Info cards */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionLabel}>Account Details</Text>

        <View style={styles.infoCard}>
          <InfoRow icon="👤" label="Full Name" value={user?.name ?? '-'} />
          <Divider />
          <InfoRow icon="✉️" label="Email" value={user?.email ?? '-'} />
          <Divider />
          <InfoRow icon="📅" label="Member Since" value={memberSince} />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionLabel}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Users')}>
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionLabel}>Browse People</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748B',
  },
  // ── Info card ─────────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 16,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  infoTextBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  // ── Actions ───────────────────────────────────────────────────────────────────
  actionsSection: {
    marginBottom: 32,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionArrow: {
    fontSize: 22,
    color: '#4F46E5',
    fontWeight: '700',
  },
  // ── Logout ────────────────────────────────────────────────────────────────────
  logoutBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
