import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiCreateReport } from '../api/reportsApi';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Lets any user submit an issue or suggestion. The superadmin sees it in the
// admin "Reports" screen and can reply.

type Props = NativeStackScreenProps<AppStackParamList, 'ReportIssue'>;

const CATEGORIES = [
  { id: 'bug', label: 'Bug' },
  { id: 'suggestion', label: 'Suggestion' },
  { id: 'abuse', label: 'Abuse' },
  { id: 'other', label: 'Other' },
];

export default function ReportIssueScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      Alert.alert('Empty', 'Please describe your issue or suggestion.');
      return;
    }
    setSubmitting(true);
    try {
      await apiCreateReport(token!, category, message.trim());
      Alert.alert('Thank you', 'Your report has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Could not submit', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Category</Text>
        <View style={styles.categories}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catPill, category === c.id && styles.catPillActive]}
              onPress={() => setCategory(c.id)}>
              <Text style={[styles.catText, category === c.id && styles.catTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Describe it</Text>
        <TextInput
          style={styles.input}
          placeholder="Tell us what's wrong or what you'd like to see…"
          placeholderTextColor={colors.textFaint}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitOff]}
          onPress={submit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.myReportsLink}
          onPress={() => navigation.navigate('MyReports')}>
          <Text style={styles.myReportsText}>View my reports</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  catText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  catTextActive: { color: colors.white },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 140,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.offWhite,
  },
  submitBtn: {
    height: 50,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  submitOff: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  myReportsLink: { alignItems: 'center', marginTop: spacing.lg },
  myReportsText: { fontSize: 14, fontWeight: '600', color: colors.ink },
});
