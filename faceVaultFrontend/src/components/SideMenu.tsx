import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import Icon from './Icon';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// ── SideMenu ──────────────────────────────────────────────────────────────────
//
// A slide-in panel from the right (opened by the menu icon in the Home top bar).
// Everyone sees Logout. Superadmins also see "Manage People" and "Manage Posts".
// Built as a Modal so it overlays the whole app. Designed to grow — add more
// links here in the future (Settings, Saved, etc.).

type Nav = NativeStackNavigationProp<AppStackParamList>;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SideMenu({ visible, onClose }: Props) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const isSuperadmin = user?.role === 'superadmin';

  // Close the menu, then run an action (so navigation happens after it hides).
  const go = (fn: () => void) => {
    onClose();
    setTimeout(fn, 150);
  };

  const confirmLogout = () => {
    onClose();
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Tapping the dim backdrop closes the menu. */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.panel, { paddingTop: insets.top + spacing.lg }]}>
        {/* User header */}
        <View style={styles.userRow}>
          <Avatar uri={user?.avatarUrl} name={user?.name} size={48} />
          <View style={styles.userText}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name}
            </Text>
            {!!user?.username && (
              <Text style={styles.userHandle} numberOfLines={1}>
                @{user.username}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Admin-only links */}
        {isSuperadmin && (
          <>
            <Text style={styles.sectionLabel}>Admin</Text>
            <MenuItem
              icon="people-outline"
              label="Manage People"
              onPress={() => go(() => navigation.navigate('ManagePeople'))}
            />
            <MenuItem
              icon="grid-outline"
              label="Manage Posts"
              onPress={() => go(() => navigation.navigate('ManagePosts'))}
            />
            <View style={styles.divider} />
          </>
        )}

        {/* Everyone */}
        <MenuItem icon="log-out-outline" label="Log out" onPress={confirmLogout} danger />
      </View>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onPress}>
      <Icon name={icon} size={22} color={danger ? colors.danger : colors.ink} />
      <Text style={[styles.itemLabel, danger && styles.itemLabelDanger]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '76%',
    maxWidth: 320,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  userHandle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  itemLabel: {
    marginLeft: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  itemLabelDanger: {
    color: colors.danger,
  },
});
