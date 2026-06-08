import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TriageLevel, UrgencyLevel } from '@/types/health';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { getTriageDisplay } from '@/utils/triage';

interface TriageResultCardProps {
  level: TriageLevel;
  urgency: UrgencyLevel;
  hardRuleTriggered?: boolean;
  hardRuleMetric?: string | null;
  recommendation: string;
  followUpFlag?: boolean;
  followUpHours?: number | null;
  compact?: boolean;
}

export function TriageResultCard({
  level,
  urgency,
  hardRuleTriggered = false,
  hardRuleMetric,
  recommendation,
  followUpFlag,
  followUpHours,
  compact = false,
}: TriageResultCardProps) {
  const display = getTriageDisplay(level, urgency, hardRuleTriggered);
  const { colors } = display;

  return (
    <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.dot + '22' }]}>
          <Ionicons
            name={display.iconName as any}
            size={20}
            color={colors.dot}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.level, { color: colors.dark }]}>{display.label}</Text>
          <Text style={[styles.sublabel, { color: colors.text }]}>{display.sublabel}</Text>
        </View>
        <View style={[styles.urgencyPill, { backgroundColor: colors.dot + '22' }]}>
          <Text style={[styles.urgencyText, { color: colors.dark }]}>
            {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
          </Text>
        </View>
      </View>

      {hardRuleTriggered && hardRuleMetric && (
        <View style={styles.hardRuleRow}>
          <Ionicons name="alert-circle" size={13} color={Colors.critical.dot} />
          <Text style={styles.hardRuleText}>
            Critical reading detected:{' '}
            <Text style={styles.hardRuleMetric}>{hardRuleMetric.replace(/_/g, ' ')}</Text>
          </Text>
        </View>
      )}

      {!compact && (
        <Text style={[styles.recommendation, { color: colors.dark }]} numberOfLines={4}>
          {recommendation}
        </Text>
      )}

      {!compact && followUpFlag && followUpHours && (
        <View style={[styles.followUp, { borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={13} color={colors.text} />
          <Text style={[styles.followUpText, { color: colors.text }]}>
            Follow up in {followUpHours}h if symptoms persist
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  level: {
    fontFamily: Font.sansSemiBold,
    fontSize: 16,
  },
  sublabel: {
    fontFamily: Font.sans,
    fontSize: 12,
  },
  urgencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  urgencyText: {
    fontFamily: Font.sansSemiBold,
    fontSize: 12,
  },
  hardRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.critical.bg,
    borderRadius: Radius.sm,
  },
  hardRuleText: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.critical.text,
    flex: 1,
  },
  hardRuleMetric: {
    fontFamily: Font.sansSemiBold,
    textTransform: 'capitalize',
  },
  recommendation: {
    fontFamily: Font.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  followUpText: {
    fontFamily: Font.sans,
    fontSize: 12,
  },
});
