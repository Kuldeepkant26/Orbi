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
import { apiSignup } from '../api/authApi';
import OrbiLogo from '../components/OrbiLogo';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!firstName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Signup no longer logs you in directly — it emails a code. We move to the
      // verify screen, passing along the email the code was sent to.
      const data = await apiSignup(
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        password,
      );
      navigation.navigate('VerifyOtp', { email: data.email });
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

          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          {/* Brand */}
          <View style={styles.brand}>
            <OrbiLogo size={52} />
            <Text style={styles.tagline}>Create your account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* First + Last name side by side */}
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.input, styles.nameInput]}
                placeholder="First name"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="words"
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.input, styles.nameInput]}
                placeholder="Last name"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="words"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

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
                placeholder="Password (min. 6 characters)"
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

            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By signing up, you agree to our Terms and Privacy Policy.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Log in</Text>
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
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameInput: {
    flex: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.offWhite,
    overflow: 'hidden',
    marginBottom: spacing.md,
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
    marginTop: spacing.xs,
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
  termsText: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
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
