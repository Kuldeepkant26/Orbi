import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet, Easing } from 'react-native';
import OrbiLogo from '../components/OrbiLogo';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// A premium, brief welcome shown right after login/signup. It animates in,
// greets the user by name, and auto-dismisses (calls onDone) after a moment.
//
//   mode 'back' → "Welcome back,\n<name>"
//   mode 'new'  → "Welcome to Orbi,\n<name>"

type Props = {
  mode: 'back' | 'new';
  name: string;
  onDone: () => void;
};

export default function WelcomeScreen({ mode, name, onDone }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textShift = useRef(new Animated.Value(12)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo in
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ]),
      // Greeting in
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(textShift, { toValue: 0, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(1100),
      // Fade the whole screen out
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [logoOpacity, logoScale, textOpacity, textShift, screenOpacity, onDone]);

  const line1 = mode === 'back' ? 'Welcome back,' : 'Welcome to Orbi,';

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <OrbiLogo size={56} showWordmark={false} />
      </Animated.View>

      <Animated.View
        style={[styles.textWrap, { opacity: textOpacity, transform: [{ translateY: textShift }] }]}>
        <Text style={styles.line1}>{line1}</Text>
        <Text style={styles.name}>{name} 👋</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { alignItems: 'center', marginTop: spacing.xl },
  line1: { fontSize: 18, color: colors.textMuted, fontWeight: '500' },
  name: { fontSize: 30, fontWeight: '800', color: colors.ink, marginTop: spacing.sm, letterSpacing: 0.3 },
});
