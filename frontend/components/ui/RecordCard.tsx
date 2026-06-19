import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Shadows } from '@/constants/shadows';
import { getTriageDisplay, formatDate, formatTime } from '@/utils/triage';
import { pickAccent } from '@/utils/cardAccents';
import { HealthRecord } from '@/types/health';

const CARD_RADIUS = Radius.lg;
const DELETE_WIDTH = 80;
const SWIPE_THRESHOLD = DELETE_WIDTH * 0.6;
const SCREEN_WIDTH = Dimensions.get('window').width;

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High quality',
  medium: 'Medium quality',
  low: 'Low quality',
};

export function RecordCard({
  record,
  onPress,
  onDelete,
}: {
  record: HealthRecord;
  onPress: () => void;
  onDelete: () => void;
}) {
  const triage = record.triage;
  const display = triage ? getTriageDisplay(triage.level, triage.urgency) : null;
  const accent = pickAccent(triage?.level, triage?.urgency);

  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy),
      onPanResponderGrant: () => {
        translateX.setOffset(isSwipeOpen.current ? -DELETE_WIDTH : 0);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, { dx }) => {
        const clamped = Math.min(0, Math.max(-SCREEN_WIDTH, dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, { dx }) => {
        translateX.flattenOffset();
        const currentOffset = isSwipeOpen.current ? -DELETE_WIDTH : 0;
        const totalDx = currentOffset + dx;

        if (totalDx < -SWIPE_THRESHOLD) {
          // snap open to reveal delete button
          Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          isSwipeOpen.current = true;
        } else {
          // snap back closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          isSwipeOpen.current = false;
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDelete());
  };

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    isSwipeOpen.current = false;
  };

  return (
    <View style={styles.wrapper}>
      {/* Delete action revealed underneath */}
      <View style={styles.deleteAction}>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={Colors.white} />
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      </View>

      {/* Swipeable card */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={() => {
            if (isSwipeOpen.current) {
              closeSwipe();
            } else {
              onPress();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`Health record from ${formatDate(record.submitted_at)}`}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: accent.bg,
              borderColor: accent.border,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          {/* Row 1: icon + date + time */}
          <View style={styles.topRow}>
            <View style={[styles.iconCircle, { backgroundColor: accent.dot }]}>
              <Ionicons
                name={(display?.iconName ?? 'pulse-outline') as any}
                size={16}
                color={Colors.white}
              />
            </View>
            <Text style={styles.dateText}>{formatDate(record.submitted_at)}</Text>
            <Text style={styles.timeText}>{formatTime(record.submitted_at)}</Text>
          </View>

          {/* Row 2: triage label */}
          <Text style={[styles.triageLabel, { color: accent.dark }]}>
            {display?.label ?? 'Pending'}
          </Text>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: accent.border }]}>
            <View style={[styles.confidencePill, { backgroundColor: accent.bg, borderColor: accent.border }]}>
              <View style={[styles.confidenceDot, { backgroundColor: accent.dot }]} />
              <Text style={[styles.confidenceText, { color: accent.dark }]}>
                {CONFIDENCE_LABEL[record.input_confidence] ?? 'Low quality'}
              </Text>
            </View>
            <View style={styles.viewLink}>
              <Text style={[styles.viewLinkText, { color: accent.dot }]}>View report</Text>
              <Ionicons name="arrow-forward" size={12} color={accent.dot} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    position: 'relative',
  },

  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    borderRadius: CARD_RADIUS,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
    width: '100%',
  },
  deleteLabel: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  card: {
    borderWidth: 1,
    borderRadius: CARD_RADIUS,
    paddingTop: 16,
    paddingHorizontal: 16,
    ...Shadows.card,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontFamily: Font.sansSemiBold,
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  timeText: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.textTertiary,
  },

  triageLabel: {
    fontFamily: Font.serif,
    fontSize: 22,
    lineHeight: 27,
    marginBottom: 12,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontFamily: Font.sansMedium,
    fontSize: 11,
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewLinkText: {
    fontFamily: Font.sansMedium,
    fontSize: 12,
  },
});
