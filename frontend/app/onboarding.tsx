import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Page {
  gradient: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  subtitle: string;
  bullets?: { icon: keyof typeof Ionicons.glyphMap; text: string }[];
  disclaimer?: string;
}

const PAGES: Page[] = [
  {
    gradient: ['#EEF4FF', '#E0EAFF'],
    icon: 'pulse',
    iconBg: Colors.primary,
    title: 'Your health,\nclearly assessed',
    subtitle:
      'HealthMonitor analyses your vitals and symptoms using AI to guide you towards the right level of care — instantly.',
    bullets: [
      { icon: 'thermometer-outline', text: 'Log temperature, heart rate, SpO₂ and blood pressure' },
      { icon: 'chatbubble-ellipses-outline', text: 'Or just describe how you feel in plain text' },
      { icon: 'medical-outline', text: 'Get a triage result in seconds' },
    ],
  },
  {
    gradient: ['#F0FFF4', '#DCFCE7'],
    icon: 'git-branch-outline',
    iconBg: Colors.normal.dot,
    title: 'How triage\nworks',
    subtitle: 'Think of it like a clinical first-step — the same logic a triage nurse uses before a doctor sees you.',
    bullets: [
      { icon: 'enter-outline', text: 'You enter your vitals or describe your symptoms' },
      { icon: 'hardware-chip-outline', text: 'AI cross-checks against clinical thresholds and hard rules' },
      { icon: 'flag-outline', text: 'You receive one of three outcomes: rest at home, visit pharmacy, or see a doctor' },
    ],
  },
  {
    gradient: ['#FFF7ED', '#FFEDD5'],
    icon: 'shield-checkmark-outline',
    iconBg: Colors.caution.dot,
    title: 'Not a diagnosis.\nNever.',
    subtitle: 'This is the most important thing to understand before you start.',
    disclaimer:
      'HealthMonitor does not diagnose conditions, prescribe treatment, or replace a qualified healthcare professional. Triage results are guidance only. In an emergency — chest pain, difficulty breathing, unconsciousness — call emergency services immediately.',
    bullets: [
      { icon: 'checkmark-circle-outline', text: 'Helps you decide where to seek care' },
      { icon: 'checkmark-circle-outline', text: 'Tracks your vitals over time' },
      { icon: 'close-circle-outline', text: 'Does not diagnose any condition' },
      { icon: 'close-circle-outline', text: 'Does not replace your doctor' },
    ],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useOnboardingStore();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentPage(index);
  };

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      goToPage(currentPage + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => completeOnboarding();

  const isLast = currentPage === PAGES.length - 1;

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.pager}
      >
        {PAGES.map((page, i) => (
          <PageView key={i} page={page} insets={insets} />
        ))}
      </ScrollView>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <Pressable key={i} onPress={() => goToPage(i)} hitSlop={8}>
              <View
                style={[
                  styles.dot,
                  i === currentPage ? styles.dotActive : styles.dotInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.btnRow}>
          {!isLast && (
            <Pressable
              onPress={handleSkip}
              style={styles.skipBtn}
              accessibilityLabel="Skip onboarding"
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleNext}
            style={styles.nextBtn}
            accessibilityLabel={isLast ? 'Get started' : 'Next page'}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextGradient}
            >
              <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
              <Ionicons
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={17}
                color={Colors.white}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PageView({
  page,
  insets,
}: {
  page: Page;
  insets: { top: number };
}) {
  return (
    <LinearGradient
      colors={page.gradient}
      style={[styles.page, { width: SCREEN_WIDTH }]}
    >
      <View style={[styles.pageContent, { paddingTop: insets.top + 48 }]}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: page.iconBg }]}>
          <Ionicons name={page.icon} size={36} color={Colors.white} />
        </View>

        {/* Title */}
        <Text style={styles.pageTitle}>{page.title}</Text>
        <Text style={styles.pageSubtitle}>{page.subtitle}</Text>

        {/* Bullets */}
        {page.bullets && (
          <View style={styles.bullets}>
            {page.bullets.map((b, i) => (
              <View key={i} style={styles.bullet}>
                <View style={styles.bulletIconWrap}>
                  <Ionicons name={b.icon} size={17} color={Colors.primary} />
                </View>
                <Text style={styles.bulletText}>{b.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer block */}
        {page.disclaimer && (
          <View style={styles.disclaimerBox}>
            <Ionicons name="warning-outline" size={16} color={Colors.caution.text} />
            <Text style={styles.disclaimerBoxText}>{page.disclaimer}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  pager: { flex: 1 },
  page: { flex: 1 },
  pageContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 120,
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  pageTitle: {
    fontFamily: Font.serif,
    fontSize: 36,
    lineHeight: 44,
    color: Colors.text,
    marginBottom: 16,
  },
  pageSubtitle: {
    fontFamily: Font.sans,
    fontSize: 16,
    lineHeight: 25,
    color: Colors.textSecondary,
    marginBottom: 32,
  },

  bullets: { gap: 14 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  bulletIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },

  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.caution.bg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.caution.border,
    padding: 16,
    marginTop: 24,
  },
  disclaimerBoxText: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.caution.dark,
  },

  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  dotInactive: { width: 8, backgroundColor: Colors.separator },

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    accessibilityRole: 'button',
  } as any,
  skipText: { fontFamily: Font.sansMedium, fontSize: 15, color: Colors.textSecondary },
  nextBtn: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  nextText: { fontFamily: Font.sansBold, fontSize: 16, color: Colors.white },
});
