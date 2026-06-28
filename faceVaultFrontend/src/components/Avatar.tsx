import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// ── Avatar ────────────────────────────────────────────────────────────────────
//
// Shows a user's profile picture. If they don't have one yet (avatarUrl is
// empty), we fall back to a neat circle with the first letter of their name.
// Used in the feed, profiles, comments, notifications — anywhere we show a user.
//
// Usage:
//   <Avatar uri={user.avatarUrl} name={user.name} size={40} />

type Props = {
  uri?: string;
  name?: string;
  size?: number;
};

export default function Avatar({ uri, name = '?', size = 40 }: Props) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  // If we have a real image URL, show it.
  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimension]} />;
  }

  // Otherwise show the first letter on a soft grey circle.
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceAlt,
  },
  fallback: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontWeight: '700',
    color: colors.textMuted,
  },
});
