import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import OrbiLogo from './OrbiLogo';
import Icon from './Icon';
import Badge from './Badge';
import SideMenu from './SideMenu';
import { useBadges } from '../context/BadgeContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// ── OrbiHeader ────────────────────────────────────────────────────────────────
//
// The shared top bar used on Home, Notifications, and Profile: the Orbi logo on
// the left, and on the right a message (DM) icon with an unread badge and a menu
// icon that opens the sidebar. Pass `title` to show a text title instead of the
// logo (e.g. "Notifications").

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function OrbiHeader({ title }: { title?: string }) {
  const navigation = useNavigation<Nav>();
  const { messageCount } = useBadges();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.bar}>
      {title ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        <OrbiLogo size={30} />
      )}

      <View style={styles.right}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Users')}
          style={styles.iconBtn}>
          <View>
            <Icon name="paper-plane-outline" size={24} color={colors.ink} />
            <Badge count={messageCount} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.iconBtn}>
          <Icon name="menu-outline" size={26} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: spacing.xs,
    marginLeft: spacing.md,
  },
});
