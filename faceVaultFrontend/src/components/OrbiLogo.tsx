import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

// ── Orbi logo ───────────────────────────────────────────────────────────────
//
// A simple premium brand mark: a circular "orbit" ring (the SVG part) followed
// by the wordmark "Orbi". We use SVG for the ring so it stays crisp at any size.
//
// Props:
//   size   → controls the overall scale (the ring diameter in px)
//   color  → ink (default) on light backgrounds
//   showWordmark → set false to show only the circular mark (e.g. a tab/app icon)
//
// Usage:
//   <OrbiLogo size={40} />                    // ring + "Orbi"
//   <OrbiLogo size={28} showWordmark={false} /> // just the ring

type Props = {
  size?: number;
  color?: string;
  showWordmark?: boolean;
};

export default function OrbiLogo({
  size = 40,
  color = colors.ink,
  showWordmark = true,
}: Props) {
  // The wordmark font size scales with the ring size so they stay balanced.
  const wordSize = size * 0.78;

  return (
    <View style={styles.row}>
      {/* The orbit mark: an outer ring with a small orbiting dot. */}
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Outer ring */}
        <Circle
          cx="50"
          cy="50"
          r="38"
          stroke={color}
          strokeWidth="8"
          fill="none"
        />
        {/* The orbiting dot, sitting on the ring at the top-right. */}
        <Circle cx="78" cy="28" r="9" fill={color} />
      </Svg>

      {showWordmark && (
        <Text
          style={[
            styles.wordmark,
            { fontSize: wordSize, color, marginLeft: size * 0.18 },
          ]}>
          Orbi
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: 0.5,
    // A slight optical nudge so the wordmark baseline lines up with the ring.
    includeFontPadding: false,
  },
});
