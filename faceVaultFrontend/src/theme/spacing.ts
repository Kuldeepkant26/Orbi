// ── Spacing scale ─────────────────────────────────────────────────────────────
//
// Consistent spacing makes a UI feel premium. Instead of sprinkling random
// numbers (13, 17, 22...) we use this small scale everywhere.
//
//   import { spacing } from '../theme/spacing';
//   <View style={{ padding: spacing.md }} />

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Common corner radii.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999, // fully rounded (avatars, pills)
};
