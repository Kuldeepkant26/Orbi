import React from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';
import { colors } from '../theme/colors';

// ── Icon ──────────────────────────────────────────────────────────────────────
//
// A thin wrapper around Ionicons so the rest of the app imports ONE icon
// component and we keep the icon library in a single place. If we ever swap
// libraries, only this file changes.
//
// Browse icon names at: https://ionic.io/ionicons
//
// Usage:
//   <Icon name="heart-outline" size={24} />
//   <Icon name="heart" size={24} color={colors.accentLike} />

type Props = {
  name: any; // Ionicons glyph name, e.g. "home" / "home-outline"
  size?: number;
  color?: string;
};

export default function Icon({ name, size = 24, color = colors.ink }: Props) {
  return <Ionicons name={name} size={size} color={color} />;
}
