// ── Orbi color palette ────────────────────────────────────────────────────────
//
// A premium black / white / off-white theme. We keep ONE source of truth for
// colors here so every screen looks consistent. Import it like:
//
//   import { colors } from '../theme/colors';
//   <View style={{ backgroundColor: colors.background }} />
//
// The "premium" feel comes from restraint: near-black text/buttons on white,
// soft off-white panels, hairline borders, and a single accent (the like heart).

export const colors = {
  // Surfaces
  background: '#FFFFFF', // main screen surface
  offWhite: '#FAFAF8',   // app background / subtle panels
  surfaceAlt: '#F4F4F2', // cards, input fills, image placeholders

  // Text / dark tones
  ink: '#0A0A0A',        // near-black: primary text and solid buttons
  inkSoft: '#1C1C1E',    // secondary dark
  textMuted: '#6B6B6B',  // captions, meta, timestamps
  textFaint: '#9A9A9A',  // placeholders, disabled text

  // Lines
  border: '#ECECEC',     // hairline separators and input borders

  // Pure
  white: '#FFFFFF',

  // Accents (used sparingly)
  danger: '#E5484D',     // error text / destructive actions
  accentLike: '#ED4956', // the like heart
};

export type Colors = typeof colors;
