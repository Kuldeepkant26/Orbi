import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../App';
import { apiVerifyOtp, apiResendOtp } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import OrbiLogo from '../components/OrbiLogo';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Email verification screen. The user lands here right after signing up (or
// after trying to log in with an unverified account). They enter the 6-digit
// code we emailed; on success they're logged in.

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds before "Resend" can be tapped again

export default function VerifyOtpScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { login, setWelcome } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const inputRef = useRef<TextInput>(null);

  // Focus the input when the screen opens.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  // Count the resend cooldown down to 0.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async (submittedCode?: string) => {
    const value = submittedCode ?? code;
    if (value.length !== CODE_LENGTH) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiVerifyOtp(email, value);
      // Brand-new account → "Welcome to Orbi, <first name>".
      setWelcome({ mode: 'new', name: data.user.firstName || data.user.name });
      // Success → log in (stores token + user, app switches to the main tabs).
      await login(data.user, data.token);
    } catch (e: any) {
      setError(e.message || 'Verification failed.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit once all 6 digits are entered (nice UX).
  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError('');
    if (digits.length === CODE_LENGTH) {
      handleVerify(digits);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setInfo('');
    try {
      await apiResendOtp(email);
      setInfo('A new code has been sent.');
      setCooldown(RESEND_COOLDOWN);
    } catch (e: any) {
      setError(e.message || 'Could not resend code.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={styles.brand}>
            <OrbiLogo size={48} />
          </View>

          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>

          {/* Code input: a single field styled to look like spaced digits. */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.codeBox}>
            <Text style={styles.codeText}>
              {code.padEnd(CODE_LENGTH, '•')}
            </Text>
          </TouchableOpacity>

          {/* The real input is invisible; the box above shows the value. */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {info ? <Text style={styles.infoText}>{info}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleVerify()}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResend}
            disabled={cooldown > 0}>
            <Text
              style={[
                styles.resendText,
                cooldown > 0 && styles.resendTextDisabled,
              ]}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    padding: spacing.sm,
  },
  backText: {
    fontSize: 24,
    color: colors.ink,
    fontWeight: '600',
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  email: {
    fontWeight: '600',
    color: colors.ink,
  },
  codeBox: {
    marginTop: spacing.xl,
    height: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 12,
    color: colors.ink,
    // nudge so the letter-spacing doesn't push text off-center
    paddingLeft: 12,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  button: {
    height: 52,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: colors.textFaint,
  },
});
