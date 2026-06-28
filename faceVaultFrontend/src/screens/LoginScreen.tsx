import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../App';
import {
  apiLogin,
  isVerificationResponse,
  isBannedResponse,
} from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import OrbiLogo from '../components/OrbiLogo';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, setWelcome } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Set when login is blocked because the account is banned.
  const [ban, setBan] = useState<{ reason: string; expires: string | null } | null>(
    null,
  );

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setBan(null);
    setLoading(true);
    try {
      const data = await apiLogin(email.trim(), password);
      // If the account isn't verified yet, the server sent a fresh code and
      // told us to route the user to the verification screen.
      if (isVerificationResponse(data)) {
        navigation.navigate('VerifyOtp', { email: data.email });
        return;
      }
      // If the account is banned, show the reason + when (if ever) it lifts.
      if (isBannedResponse(data)) {
        setBan({ reason: data.banReason, expires: data.banExpires });
        return;
      }
      // Show "Welcome back, <first name>" once we're in.
      setWelcome({ mode: 'back', name: data.user.firstName || data.user.name });
      await login(data.user, data.token);
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Brand */}
          <View style={styles.brand}>
            <OrbiLogo size={56} />
            <Text style={styles.tagline}>Share your world, beautifully.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {ban ? (
              <View style={styles.banBox}>
                <Text style={styles.banTitle}>Account restricted</Text>
                {!!ban.reason && (
                  <Text style={styles.banReason}>{ban.reason}</Text>
                )}
                <Text style={styles.banWhen}>
                  {ban.expires
                    ? `Your access returns on ${new Date(
                        ban.expires,
                      ).toLocaleDateString()}.`
                    : 'This restriction is permanent.'}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={colors.textFaint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(p => !p)}>
                <Text style={styles.eyeText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  form: {
    width: '100%',
  },
  errorBox: {
    backgroundColor: '#FEECEC',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  banBox: {
    backgroundColor: '#FEECEC',
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  banTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  banReason: {
    fontSize: 14,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  banWhen: {
    fontSize: 13,
    color: colors.textMuted,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.offWhite,
    marginBottom: spacing.md,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.offWhite,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.ink,
  },
  eyeBtn: {
    paddingHorizontal: spacing.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  button: {
    height: 52,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  forgotBtn: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  footerLink: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: '700',
  },
});
