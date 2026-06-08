# **UI DESIGN**

## Mobile Health Triage App — React Native (iOS-First)

**Aesthetic Direction:** Refined Medical Luxury
Calm, trustworthy, and premium. Inspired by iOS’s depth and translucency system —
frosted glass cards, soft gradients, fluid micro-animations, generous whitespace.
The interface should feel like it belongs on a surgeon’s personal iPhone, not a
government health portal.

-----

## 1. Color System

```js
// theme/colors.js

export const colors = {

  // --- Backgrounds ---
  bg: {
    primary:   '#F2F5FA',   // Soft cool white — main screen background
    secondary: '#FFFFFF',   // Pure white — card surfaces
    elevated:  'rgba(255,255,255,0.72)', // Frosted glass card overlay
  },

  // --- Brand Gradients ---
  gradient: {
    hero:     ['#1A6BFF', '#0A3FCC'],         // Deep royal blue — primary CTA, header
    calm:     ['#E8F0FF', '#F2F5FA'],         // Subtle blue-white — screen background wash
    success:  ['#00C896', '#00A878'],         // Teal green — "Rest at Home"
    caution:  ['#FF9F43', '#FF6B35'],         // Amber-orange — "Visit Pharmacy"
    critical: ['#FF4757', '#C0392B'],         // Red — "See a Doctor"
    card:     ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'], // Glass card
  },

  // --- Triage Levels ---
  triage: {
    safe:     '#00C896',  // rest_at_home
    caution:  '#FF9F43',  // visit_pharmacy
    critical: '#FF4757',  // see_doctor
  },

  // --- Text ---
  text: {
    primary:   '#0D1B3E',   // Near-black navy — headings
    secondary: '#4A5B7A',   // Muted navy — body
    tertiary:  '#8A9BBF',   // Lighter — labels, captions
    inverse:   '#FFFFFF',   // On dark/gradient surfaces
    link:      '#1A6BFF',   // Interactive
  },

  // --- UI Elements ---
  ui: {
    border:      'rgba(26, 107, 255, 0.10)',  // Subtle blue-tinted borders
    divider:     'rgba(13, 27, 62, 0.06)',
    shadow:      'rgba(26, 107, 255, 0.12)',
    inputBg:     'rgba(242, 245, 250, 0.8)',
    placeholder: '#A0AECF',
    tabBar:      'rgba(255, 255, 255, 0.88)', // Frosted tab bar
    overlay:     'rgba(13, 27, 62, 0.40)',    // Modal backdrop
  },

  // --- Status ---
  status: {
    normal:  '#00C896',
    warning: '#FF9F43',
    danger:  '#FF4757',
    info:    '#1A6BFF',
  },

  // --- Confidence Levels ---
  // Subtle, never competing with triage colours
  confidence: {
    high:   '#00C896',               // Teal — full information provided
    medium: '#8A9BBF',               // Muted navy-grey — partial information
    low:    '#FF9F43',               // Amber — sparse input, lean cautious
    highBg: 'rgba(0,200,150,0.10)',
    medBg:  'rgba(138,155,191,0.10)',
    lowBg:  'rgba(255,159,67,0.10)',
  },
};
```

-----

## 2. Typography

```js
// theme/typography.js
// Primary: "DM Serif Display" (headings) — elegant, medical authority
// Secondary: "DM Sans" (body) — clean, highly legible at small sizes
// Import via expo-google-fonts

import { useFonts,
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display';

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';

export const typography = {
  // Display — hero headings
  display: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },

  // H1 — screen titles
  h1: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },

  // H2 — section headings
  h2: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.text.primary,
  },

  // H3 — card titles
  h3: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: colors.text.primary,
  },

  // Body — paragraph text
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
  },

  // Body Medium
  bodyMedium: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
  },

  // Caption — labels, metadata
  caption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.tertiary,
  },

  // Label — input labels, tags
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    color: colors.text.secondary,
  },

  // Overline — section identifiers (uppercase)
  overline: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
  },
};
```

-----

## 3. Spacing, Layout & Safe Area

```js
// theme/spacing.js

export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
};

// Static layout constants — device-agnostic values only.
// DO NOT put screen-width or safe-area values here.
// Those are dynamic and must come from useLayout() below.
export const layout = {
  screenPaddingH: 20,   // Horizontal screen padding (applied via useLayout)
  cardPadding:    20,
  sectionGap:     28,
};
```

```js
// theme/useLayout.js
// The single hook every screen imports for all sizing and inset values.
// Uses useWindowDimensions() (reactive) instead of Dimensions.get() (static).
// Safe-area insets are consumed here so screens never hard-code top/bottom offsets.

import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useLayout = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return {
    // Screen dimensions — reactive to rotation and split-screen
    width,
    height,

    // Safe area insets — accounts for notch, Dynamic Island, home indicator
    insets,

    // Derived layout values
    screenPaddingH:  20,
    contentWidth:    width - 40,           // Full-width content (20px padding each side)
    halfWidth:       (width - 56) / 2,     // Two-column grid items (20 + 8 gap + 20 + 8)
    thirdWidth:      (width - 64) / 3,     // Three-column grid items

    // Header height: status bar inset + navigation bar
    headerHeight:    insets.top + 52,

    // Bottom offset: home indicator + tab bar height
    // Use this for ScrollView contentInset and fixed bottom buttons
    bottomOffset:    insets.bottom + 84,

    // Card and container widths
    cardWidth:       width - 40,
    modalWidth:      width - 48,

    // Tablet detection (iPad or large Android tablet)
    isTablet:        width >= 768,
  };
};
```

### Safe Area Setup — App Root

The `SafeAreaProvider` must wrap the entire app at the root level.
Individual screens use `useSafeAreaInsets()` via `useLayout()` —
they do **not** wrap content in `<SafeAreaView>` directly, as this
conflicts with full-bleed gradient backgrounds.

```jsx
// App.jsx (root)
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/* rest of app */}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

### How Screens Use useLayout()

```jsx
// Example: HomeScreen.jsx
import { useLayout } from '../theme/useLayout';

const HomeScreen = () => {
  const { width, contentWidth, insets, bottomOffset, halfWidth } = useLayout();

  return (
    <View style={{ flex: 1 }}>
      {/* Full-bleed gradient behind status bar */}
      <LinearGradient
        colors={colors.gradient.calm}
        style={[styles.background, { paddingTop: insets.top }]}
      />

      {/* Scrollable content respects safe area */}
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: bottomOffset,
        }}
      >
        {/* Content width is always relative, never hardcoded */}
        <TriageResultCard style={{ width: contentWidth }} />

        {/* Two-column input grid */}
        <View style={styles.grid}>
          <HealthInputField style={{ width: halfWidth }} />
          <HealthInputField style={{ width: halfWidth }} />
        </View>
      </ScrollView>

      {/* Fixed bottom button sits above home indicator */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Submit" onPress={handleSubmit} />
      </View>
    </View>
  );
};
```

### Per-Component Sizing Rules

|Component                  |Width Rule                                |
|---------------------------|------------------------------------------|
|`TriageResultCard`         |`contentWidth` (full screen minus padding)|
|`GlassCard`                |`contentWidth`                            |
|`PrimaryButton`            |`contentWidth`                            |
|`HealthInputField` (single)|`contentWidth`                            |
|`HealthInputField` (grid)  |`halfWidth`                               |
|`ModeToggle`               |`contentWidth`                            |
|`SparseInputNudge`         |`contentWidth`                            |
|`ConfidenceBadge`          |`auto` (self-sizing pill)                 |
|Modal / Bottom Sheet       |`modalWidth`                              |

### Why useWindowDimensions over Dimensions.get()

`Dimensions.get('window')` is called once at module load time and
does not update when the device rotates or the user enters split-screen
on Android. `useWindowDimensions()` is a React hook that re-renders
the component whenever dimensions change — making all layout values
always correct regardless of device state. In a health app that may be
used in both portrait and landscape, and on devices from iPhone SE
to iPad, this matters.

-----

## 4. Border Radius

```js
// theme/radius.js
// Consistent, generous rounding throughout — iOS-native feel

export const radius = {
  sm:     8,    // Small chips, tags
  md:     14,   // Input fields, small cards
  lg:     20,   // Standard cards
  xl:     28,   // Large cards, bottom sheets
  xxl:    36,   // Hero cards
  full:   999,  // Pills, circular buttons, avatars
};
```

-----

## 5. Shadows & Elevation

```js
// theme/shadows.js
// iOS-style shadows: soft, diffuse, blue-tinted

export const shadows = {

  // Subtle — inputs, inactive cards
  sm: {
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,   // Android fallback
  },

  // Default — standard cards
  md: {
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },

  // Prominent — floating buttons, bottom sheets
  lg: {
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },

  // Hero — primary CTA button
  hero: {
    shadowColor: '#1A6BFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },

  // Triage result cards
  triage: (triageColor) => ({
    shadowColor: triageColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  }),
};
```

-----

## 6. Animation & Transition Patterns

All animations use `react-native-reanimated` (v3) for 60fps native-thread performance.
Use `react-native-animatable` for simpler entrance effects.

```js
// theme/animations.js
import { withSpring, withTiming, Easing } from 'react-native-reanimated';

export const transitions = {

  // Spring — button presses, card reveals (bouncy, iOS-native feel)
  spring: {
    damping: 18,
    stiffness: 200,
    mass: 0.8,
  },

  // Smooth — fades, slides (no bounce)
  smooth: (duration = 300) => withTiming(1, {
    duration,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  }),

  // Snappy — tab switches, toggles
  snappy: (duration = 180) => withTiming(1, {
    duration,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  }),
};

// Durations
export const duration = {
  fast:   150,
  normal: 280,
  slow:   450,
  reveal: 600,   // Screen entrance
};
```

### Animation Patterns by Interaction

**Screen entrance (staggered reveal):**

```js
// Each element fades up with a staggered delay
// delay: 0ms, 80ms, 160ms, 240ms...
const enterStyle = useAnimatedStyle(() => ({
  opacity: withTiming(1, { duration: 500 }),
  transform: [{
    translateY: withSpring(0, { damping: 20, stiffness: 180 })
  }],
}));
// Initial: opacity: 0, translateY: 24
```

**Button press (scale feedback):**

```js
const pressStyle = useAnimatedStyle(() => ({
  transform: [{
    scale: withSpring(pressed.value ? 0.96 : 1, {
      damping: 15,
      stiffness: 300,
    })
  }]
}));
```

**Triage result reveal (dramatic entrance):**

```js
// Card scales up from 0.85 + fades in over 600ms
// Colour pulse animation on the triage badge (subtle glow)
const resultStyle = useAnimatedStyle(() => ({
  opacity: withTiming(visible.value ? 1 : 0, { duration: 500 }),
  transform: [{
    scale: withSpring(visible.value ? 1 : 0.85, {
      damping: 16,
      stiffness: 160,
    })
  }]
}));
```

**Input focus ring:**

```js
// Border colour transitions from ui.border → brand blue on focus
// Border width: 1px → 1.5px
const borderStyle = useAnimatedStyle(() => ({
  borderColor: withTiming(
    focused.value ? colors.text.link : colors.ui.border,
    { duration: 180 }
  ),
}));
```

**Loading pulse (skeleton):**

```js
// Shimmer animation on skeleton cards while API call is in flight
// Use react-native-skeleton-placeholder or custom shimmer
```

-----

## 7. Component Patterns

### GlassCard

The primary surface component. Frosted translucency, soft border, medium shadow.

```jsx
// components/GlassCard.jsx
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const GlassCard = ({ children, style }) => (
  <View style={[styles.wrapper, style]}>
    <BlurView intensity={40} tint="light" style={styles.blur}>
      <LinearGradient
        colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.60)']}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </BlurView>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    ...shadows.md,
  },
  blur: { flex: 1 },
  gradient: {
    padding: layout.cardPadding,
  },
});
```

-----

### PrimaryButton

Full-width gradient CTA with hero shadow and press animation.

```jsx
// components/PrimaryButton.jsx
const PrimaryButton = ({ label, onPress, loading }) => {
  const pressed = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.97 : 1, transitions.spring) }]
  }));

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      <Pressable
        onPressIn={() => pressed.value = 1}
        onPressOut={() => pressed.value = 0}
        onPress={onPress}
      >
        <LinearGradient
          colors={colors.gradient.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.label}>{label}</Text>
          }
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.full,
    ...shadows.hero,
  },
  gradient: {
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: {
    ...typography.h3,
    color: colors.text.inverse,
    letterSpacing: 0.2,
  },
});
```

-----

### HealthInputField

Animated focus ring, unit label, clean background.

```jsx
// components/HealthInputField.jsx
const HealthInputField = ({ label, unit, value, onChangeText, placeholder }) => {
  const focused = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(
      focused.value ? colors.text.link : colors.ui.border,
      { duration: 200 }
    ),
    borderWidth: withTiming(focused.value ? 1.5 : 1, { duration: 200 }),
  }));

  return (
    <View style={styles.container}>
      <Text style={typography.label}>{label}</Text>
      <Animated.View style={[styles.inputWrapper, borderStyle]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ui.placeholder}
          keyboardType="decimal-pad"
          onFocus={() => focused.value = 1}
          onBlur={() => focused.value = 0}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ui.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
  },
  unit: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
});
```

-----

### TriageResultCard

The most important component. Colour-coded gradient + animated entrance.

```jsx
// components/TriageResultCard.jsx
const TRIAGE_CONFIG = {
  rest_at_home: {
    gradient: colors.gradient.success,
    icon: '🌿',
    title: 'Rest at Home',
    color: colors.triage.safe,
  },
  visit_pharmacy: {
    gradient: colors.gradient.caution,
    icon: '💊',
    title: 'Visit a Pharmacy',
    color: colors.triage.caution,
  },
  see_doctor: {
    gradient: colors.gradient.critical,
    icon: '🏥',
    title: 'See a Doctor',
    color: colors.triage.critical,
  },
};

const TriageResultCard = ({ level, recommendation, urgency, confidence, visible }) => {
  const config = TRIAGE_CONFIG[level];

  const cardStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 500 }),
    transform: [{
      scale: withSpring(visible ? 1 : 0.88, { damping: 16, stiffness: 160 })
    }],
  }));

  return (
    <Animated.View style={[cardStyle, shadows.triage(config.color)]}>
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={styles.title}>{config.title}</Text>
        <View style={styles.divider} />
        <Text style={styles.recommendation}>{recommendation}</Text>
        <UrgencyBadge urgency={urgency} />
        <ConfidenceBadge confidence={confidence} />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  icon: { fontSize: 40 },
  title: {
    ...typography.h1,
    color: colors.text.inverse,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: spacing.sm,
  },
  recommendation: {
    ...typography.body,
    color: 'rgba(255,255,255,0.90)',
    lineHeight: 26,
  },
});
```

-----

### ModeToggle

Segmented control for switching between Log Readings / Describe Symptoms.

```jsx
// components/ModeToggle.jsx
// Animated sliding indicator under the active tab
// Transitions smoothly between modes with spring animation
const ModeToggle = ({ mode, onChange }) => {
  const translateX = useSharedValue(mode === 'structured' ? 0 : 1);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: withSpring(
        translateX.value * ((SCREEN_WIDTH - 56) / 2),
        { damping: 20, stiffness: 250 }
      )
    }]
  }));

  // Pill-shaped toggle, white sliding indicator
  // Active label: text.primary bold
  // Inactive label: text.tertiary regular
};
```

-----

### ConfidenceBadge

A small, unobtrusive pill shown at the bottom of the TriageResultCard.
Communicates input quality without undermining the recommendation itself.

```jsx
// components/ConfidenceBadge.jsx

const CONFIDENCE_CONFIG = {
  high: {
    label: 'Based on full information',
    color: colors.confidence.high,
    bg:    colors.confidence.highBg,
    icon:  '●',   // solid dot
  },
  medium: {
    label: 'Based on partial information',
    color: colors.confidence.medium,
    bg:    colors.confidence.medBg,
    icon:  '◐',   // half dot
  },
  low: {
    label: 'Based on limited information',
    color: colors.confidence.low,
    bg:    colors.confidence.lowBg,
    icon:  '○',   // empty dot
  },
};

const ConfidenceBadge = ({ confidence }) => {
  const config = CONFIDENCE_CONFIG[confidence];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  icon: {
    fontSize: 10,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
  },
});
```

**Placement rules:**

- Always the last element inside `TriageResultCard`, below the recommendation text
- On a gradient card surface, use `rgba(255,255,255,0.15)` as the badge background instead of the `confidence.bg` tokens — so it reads cleanly against the coloured card
- Never shown prominently. Font size 11, not bolded. The triage level is the hero, not the confidence.

-----

### SparseInputNudge

The soft inline prompt that appears on the InputScreen when structured readings
are sparse and no description has been written yet. Fades in gently — never
blocks, never demands.

```jsx
// components/SparseInputNudge.jsx

const SparseInputNudge = ({ visible, onDismiss }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 300 });
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    // Slides up 8px as it fades in
    transform: [{
      translateY: withTiming(visible ? 0 : 8, { duration: 300 })
    }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.nudge, animStyle]}>
      <Ionicons
        name="information-circle-outline"
        size={16}
        color={colors.text.link}
        style={styles.icon}
      />
      <Text style={styles.text}>
        Adding a short description of how you feel can help us give you a better recommendation.
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={14} color={colors.text.tertiary} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  nudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(26, 107, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(26, 107, 255, 0.15)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  icon: {
    marginTop: 1,   // Optical alignment with first line of text
  },
  text: {
    ...typography.caption,
    flex: 1,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
```

**Trigger logic (InputScreen):**

```js
// Show the nudge when:
// - At least one structured field has been filled
// - The description field is empty or untouched
// - The user has not dismissed it this session

const showNudge = hasAnyReading && !hasDescription && !nudgeDismissed;
```

**Visual behaviour:**

- Fades in after a 1.5s delay once the first reading field is filled — not immediately, so it doesn’t feel intrusive
- Dismissed by the close button (×) or by the user starting to type in the description field
- Never reappears once dismissed within the same session
- Not shown at all if the user arrived via the Describe Symptoms tab

-----

## 8. Screen-Level Design Specs

### HomeScreen

- Full-bleed gradient background wash (`colors.gradient.calm`) behind everything
- Large serif greeting: *“Good morning, Ama”* in `typography.display`
- Last triage result card prominent at top (GlassCard with coloured left border)
- Quick action button: *“Check my health”* → PrimaryButton, full width
- History list below: compact GlassCard rows, each with triage colour dot

### InputScreen

- Sticky header with screen title
- ModeToggle pinned below header
- Structured mode: 2-column grid of HealthInputFields (temp + HR / SpO2 + BP)
- Descriptive mode: large `TextInput` with character count, min-height 120
- Both sections visible simultaneously when both have content (Mode 3 natural)
- `SparseInputNudge` appears below the structured fields after 1.5s delay when readings are present but description is empty — fades out when user begins typing in description
- Submit button: fixed to bottom, floats above keyboard (`KeyboardAvoidingView`)

### ReportScreen

- TriageResultCard full width at top — the hero element, includes `ConfidenceBadge` at the bottom of the card
- Readings summary cards below: one row per metric, status dot + value
- Disclaimer in a neutral GlassCard at the bottom, `typography.caption`
- Share button (top right) — export report as image or PDF

### HistoryScreen

- Timeline layout: vertical line with coloured dots per triage level
- Each entry: date, triage level badge, tap to expand full report
- Empty state: illustrated card with gentle CTA to submit first reading

-----

## 9. Navigation & Tab Bar

```js
// Tab bar: frosted glass, BlurView background, no visible border
// Icons: SF Symbols style (use @expo/vector-icons Ionicons as proxy)
// Active tab: brand blue icon + label
// Inactive: text.tertiary

tabs: [
  { name: 'Home',    icon: 'home',            screen: 'HomeScreen'    },
  { name: 'Check',   icon: 'pulse',           screen: 'InputScreen'   },
  { name: 'History', icon: 'time-outline',    screen: 'HistoryScreen' },
  { name: 'Profile', icon: 'person-outline',  screen: 'ProfileScreen' },
]

// Tab bar style
tabBarStyle: {
  position: 'absolute',
  backgroundColor: colors.ui.tabBar,
  borderTopWidth: 0,
  height: layout.bottomTabHeight,
  borderRadius: 0,
  // BlurView underneath for iOS frosted effect
}
```

-----

## 10. Key Libraries

|Library                                      |Purpose                                                                                                                           |
|---------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
|`react-native-reanimated` v3                 |All animations (native thread, 60fps)                                                                                             |
|`expo-linear-gradient`                       |All gradient surfaces                                                                                                             |
|`expo-blur`                                  |Frosted glass / BlurView                                                                                                          |
|`react-native-animatable`                    |Simple entrance animations                                                                                                        |
|`@expo-google-fonts/dm-serif-display`        |Display font                                                                                                                      |
|`@expo-google-fonts/dm-sans`                 |Body font                                                                                                                         |
|`react-native-skeleton-placeholder`          |Loading skeletons                                                                                                                 |
|`@expo/vector-icons`                         |Ionicons (SF Symbols proxy)                                                                                                       |
|`react-native-safe-area-context`             |`SafeAreaProvider` at root + `useSafeAreaInsets()` in `useLayout()` — handles notch, Dynamic Island, home indicator on all devices|
|`useWindowDimensions` (React Native built-in)|Reactive screen dimensions — used in `useLayout()` instead of static `Dimensions.get()`                                           |
|`@react-navigation/bottom-tabs`              |Tab navigation                                                                                                                    |

-----

## 11. Design Principles Summary

|Principle               |Implementation                                                                                                                                               |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Depth**               |Layered surfaces: background → BlurView → GlassCard → content                                                                                                |
|**Consistency**         |Every interactive element uses `radius.full` or `radius.lg`. No exceptions.                                                                                  |
|**Feedback**            |Every tap has a scale animation. Every input has a focus ring.                                                                                               |
|**Colour meaning**      |Green = safe, Amber = caution, Red = urgent. Consistent everywhere.                                                                                          |
|**Typography hierarchy**|Serif for emotion (headings), sans-serif for clarity (body/labels)                                                                                           |
|**Whitespace**          |Generous. Never cramped. Minimum 20px screen padding always respected.                                                                                       |
|**Loading states**      |Skeleton placeholders, never blank screens or spinners alone                                                                                                 |
|**Accessibility**       |Minimum tap target 44×44pt. Contrast ratios WCAG AA compliant.                                                                                               |
|**Safe area respect**   |Every screen uses `useLayout()` — no content ever renders behind notch, Dynamic Island, or home indicator                                                    |
|**Responsive sizing**   |No hardcoded pixel widths for layout. All widths derived from `useWindowDimensions()` via `useLayout()` — correct on every screen size from iPhone SE to iPad|