// ── Typography scale ──────────────────────────────────────────────────────────
//
// Font sizes and weights used across the app. Keeping them here means text
// looks consistent and is easy to tweak in one place.
//
//   import { type } from '../theme/typography';
//   <Text style={type.title}>Orbi</Text>

import { TextStyle } from 'react-native';
import { colors } from './colors';

export const type: Record<string, TextStyle> = {
  // Big screen titles
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  // Section / card headings
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  // Usernames, emphasized labels
  semibold: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  // Normal body text
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink,
  },
  // Captions, timestamps, secondary info
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
};
