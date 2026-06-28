import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// ── Badge ─────────────────────────────────────────────────────────────────────
//
// A small red count bubble shown on top of an icon. Renders nothing when the
// count is 0. Caps at "9+". Position it by wrapping the icon in a relative View.
//
// Usage:
//   <View>
//     <Icon name="heart" />
//     <Badge count={notifCount} />
//   </View>

export default function Badge({ count }: { count: number }) {
  if (!count || count < 1) return null;
  const label = count > 9 ? '9+' : String(count);

  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accentLike,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  text: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
