import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, Easing } from 'react-native';
import { colors } from '../theme/colors';

// ── Skeleton ──────────────────────────────────────────────────────────────────
//
// A single shimmering placeholder block. Compose these to build skeleton
// versions of any screen (a grey box that gently pulses while real data loads).
//
// Usage:
//   <Skeleton width={120} height={16} radius={8} />
//   <Skeleton width="100%" height={200} />
//
// One shared looping animation drives the opacity, so it's cheap.

type Props = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export default function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: Props) {
  // Animated opacity that loops between dim and bright for the "pulse" effect.
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: colors.surfaceAlt,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

// A circular skeleton (for avatars).
export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} radius={size / 2} />;
}
