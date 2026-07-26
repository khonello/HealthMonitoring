import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { feedbackService } from '@/services/feedbackService';
import {
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_MIN_LENGTH,
  FEEDBACK_STATUS_LABELS,
} from '@/types/feedback';
import { APP_VERSION } from '@/constants/app';
import { Colors, Palette } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';

const CATEGORIES: { key: FeedbackCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'triage_accuracy', icon: 'pulse-outline' },
  { key: 'bug', icon: 'bug-outline' },
  { key: 'usability', icon: 'help-buoy-outline' },
  { key: 'suggestion', icon: 'bulb-outline' },
  { key: 'other', icon: 'chatbubble-ellipses-outline' },
];

const STATUS_PALETTES: Record<FeedbackStatus, Palette> = {
  new: {
    text: Colors.primaryText,
    bg: Colors.primaryLight,
    border: Colors.primaryMuted,
    dot: Colors.primary,
    dark: Colors.primaryText,
  },
  reviewed: Colors.caution,
  resolved: Colors.normal,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ recordId?: string }>();
  const attachedRecordId = params.recordId ? Number(params.recordId) : null;

  const [category, setCategory] = useState<FeedbackCategory>(
    attachedRecordId ? 'triage_accuracy' : 'suggestion'
  );
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [past, setPast] = useState<Feedback[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  const loadPast = useCallback(async () => {
    setLoadingPast(true);
    try {
      const data = await feedbackService.getMine();
      setPast(data.results);
    } catch {
      // A failed history fetch must not block the form — leave the list empty.
    } finally {
      setLoadingPast(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPast();
    }, [loadPast])
  );

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= FEEDBACK_MIN_LENGTH && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await feedbackService.submit({
        category,
        message: trimmed,
        rating,
        health_record: attachedRecordId,
        app_version: APP_VERSION,
        platform: Platform.OS,
      });
      setMessage('');
      setRating(null);
      await loadPast();
      Alert.alert(
        'Thank you',
        'Your feedback has been sent. You can see its status at the bottom of this screen.'
      );
    } catch {
      Alert.alert('Could not send', 'Your feedback did not go through. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <Header title="Send Feedback" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        >
          <Text style={styles.intro}>
            Tell us what is working and what is not. Reports about triage results help us make the
            assessment safer for everyone.
          </Text>

          {attachedRecordId != null && (
            <View style={styles.attachedCard}>
              <Ionicons name="link-outline" size={16} color={Colors.primary} />
              <Text style={styles.attachedText}>
                This feedback is attached to one of your check-ins, so we can review the exact
                result you saw.
              </Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>WHAT IS THIS ABOUT?</Text>
          <View style={styles.chipWrap}>
            {CATEGORIES.map(({ key, icon }) => {
              const selected = category === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setCategory(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={FEEDBACK_CATEGORY_LABELS[key]}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons
                    name={icon}
                    size={15}
                    color={selected ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {FEEDBACK_CATEGORY_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>YOUR MESSAGE</Text>
          <View style={styles.textAreaCard}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              maxLength={FEEDBACK_MAX_LENGTH}
              placeholder="What happened, or what would you change?"
              placeholderTextColor={Colors.placeholder}
              style={styles.textArea}
              accessibilityLabel="Feedback message"
            />
            <Text style={styles.counter}>
              {trimmed.length < FEEDBACK_MIN_LENGTH ? (
                <Text style={styles.counterHint}>
                  {FEEDBACK_MIN_LENGTH - trimmed.length} more character
                  {FEEDBACK_MIN_LENGTH - trimmed.length === 1 ? '' : 's'} needed
                </Text>
              ) : (
                `${trimmed.length} / ${FEEDBACK_MAX_LENGTH}`
              )}
            </Text>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.ratingLabelWrap}>
              <Text style={styles.sectionLabelInline}>RATE THE APP</Text>
              <Text style={styles.optional}>optional</Text>
            </View>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setRating(rating === value ? null : value)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${value} out of 5`}
                  accessibilityState={{ selected: rating != null && value <= rating }}
                >
                  <Ionicons
                    name={rating != null && value <= rating ? 'star' : 'star-outline'}
                    size={26}
                    color={rating != null && value <= rating ? Colors.caution.dot : Colors.textTertiary}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <PrimaryButton
            label="Send Feedback"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
            accessibilityHint="Sends your message to the team"
            style={styles.submit}
          />

          <View style={styles.pastSection}>
            <Text style={styles.sectionLabel}>YOUR PAST FEEDBACK</Text>
            {loadingPast ? (
              <ActivityIndicator color={Colors.primary} style={styles.pastLoading} />
            ) : past.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={22} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>
                  Nothing yet. Anything you send will appear here with its status.
                </Text>
              </View>
            ) : (
              past.map((item) => {
                const palette = STATUS_PALETTES[item.status];
                return (
                  <View key={item.id} style={styles.pastCard}>
                    <View style={styles.pastHeader}>
                      <Text style={styles.pastCategory}>
                        {FEEDBACK_CATEGORY_LABELS[item.category]}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: palette.bg, borderColor: palette.border },
                        ]}
                      >
                        <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
                        <Text style={[styles.statusText, { color: palette.dark }]}>
                          {FEEDBACK_STATUS_LABELS[item.status]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.pastMessage}>{item.message}</Text>
                    <Text style={styles.pastDate}>
                      {formatDate(item.created_at)}
                      {item.rating != null ? ` · rated ${item.rating}/5` : ''}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH, paddingTop: 16 },

  intro: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },

  attachedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    padding: 12,
    marginBottom: 20,
  },
  attachedText: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.primaryText,
    lineHeight: 18,
  },

  sectionLabel: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionLabelInline: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary },

  textAreaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 20,
    ...Shadows.card,
  },
  textArea: {
    fontFamily: Font.sans,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
    minHeight: 130,
  },
  counter: {
    fontFamily: Font.sansMedium,
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 10,
    textAlign: 'right',
  },
  counterHint: { color: Colors.caution.text },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    ...Shadows.card,
  },
  ratingLabelWrap: { gap: 3 },
  optional: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary },
  stars: { flexDirection: 'row', gap: 6 },

  submit: { marginBottom: 32 },

  pastSection: { marginBottom: 8 },
  pastLoading: { marginVertical: 20 },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  pastCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 10,
    ...Shadows.card,
  },
  pastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  pastCategory: { ...TextStyles.h4, flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Font.sansSemiBold, fontSize: 11 },
  pastMessage: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 8,
  },
  pastDate: { fontFamily: Font.sans, fontSize: 12, color: Colors.textTertiary },
});
