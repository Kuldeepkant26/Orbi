import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import FloatingNav from '../components/FloatingNav';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  // Avatar initial
  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name} 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        {/* Quick-stats cards */}
        <View style={styles.cardRow}>
          <View style={[styles.card, styles.cardPurple]}>
            <Text style={styles.cardIcon}>💬</Text>
            <Text style={styles.cardLabel}>Chats</Text>
          </View>
          <View style={[styles.card, styles.cardBlue]}>
            <Text style={styles.cardIcon}>👥</Text>
            <Text style={styles.cardLabel}>People</Text>
          </View>
          <View style={[styles.card, styles.cardGreen]}>
            <Text style={styles.cardIcon}>🔒</Text>
            <Text style={styles.cardLabel}>Secure</Text>
          </View>
        </View>

        {/* Info block */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>FaceVault</Text>
          <Text style={styles.infoSub}>
            A private, end-to-end messaging app.{'\n'}
            Use the menu below to navigate.
          </Text>
        </View>
      </View>

      {/*
        Floating navigation menu — tapping "+" expands options:
        Profile, People, and Logout
      */}
      <FloatingNav
        items={[
          {
            label: 'Log Out',
            icon: '🚪',
            onPress: logout,
          },
          {
            label: 'People',
            icon: '👥',
            onPress: () => navigation.navigate('Users'),
          },
          {
            label: 'Profile',
            icon: '👤',
            onPress: () => navigation.navigate('Profile'),
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    marginTop: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  // ── Stat cards ───────────────────────────────────────────────────────────────
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardPurple: { backgroundColor: '#4F46E5' },
  cardBlue: { backgroundColor: '#0EA5E9' },
  cardGreen: { backgroundColor: '#10B981' },
  cardIcon: { fontSize: 26, marginBottom: 6 },
  cardLabel: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  // ── Info ─────────────────────────────────────────────────────────────────────
  infoBlock: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  infoSub: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
});
