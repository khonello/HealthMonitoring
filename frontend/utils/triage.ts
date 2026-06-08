import { TriageLevel, UrgencyLevel } from '@/types/health';
import { ReadingStatus } from '@/types/report';
import { Colors } from '@/constants/colors';

export interface TriageDisplay {
  label: string;
  sublabel: string;
  colors: typeof Colors.normal;
  iconName: string;
}

export function getTriageDisplay(
  level: TriageLevel,
  urgency?: UrgencyLevel,
  hardRule?: boolean
): TriageDisplay {
  if (hardRule) {
    return {
      label: 'Critical Alert',
      sublabel: 'Seek immediate medical care',
      colors: Colors.critical,
      iconName: 'warning-outline',
    };
  }
  switch (level) {
    case 'see_doctor':
      return {
        label: 'See a Doctor',
        sublabel: urgency === 'high' ? 'As soon as possible' : 'Within 24 hours',
        colors: urgency === 'high' ? Colors.critical : Colors.alert,
        iconName: 'medical-outline',
      };
    case 'visit_pharmacy':
      return {
        label: 'Visit Pharmacy',
        sublabel: 'OTC treatment may help',
        colors: Colors.caution,
        iconName: 'medkit-outline',
      };
    case 'rest_at_home':
    default:
      return {
        label: 'Rest at Home',
        sublabel: 'Monitor your symptoms',
        colors: Colors.normal,
        iconName: 'home-outline',
      };
  }
}

export function getReadingStatusColors(status: ReadingStatus) {
  switch (status) {
    case 'critical':
      return Colors.critical;
    case 'mildly_elevated':
    case 'stage_1_hypertension':
    case 'stage_2_hypertension':
    case 'high':
      return Colors.alert;
    case 'borderline_elevated':
    case 'elevated':
    case 'low':
      return Colors.caution;
    case 'normal':
    default:
      return Colors.normal;
  }
}

export function readingStatusLabel(status: ReadingStatus): string {
  const map: Record<ReadingStatus, string> = {
    normal: 'Normal',
    mildly_elevated: 'Slightly elevated',
    borderline_elevated: 'Borderline',
    elevated: 'Elevated',
    low: 'Low',
    high: 'High',
    critical: 'Critical',
    stage_1_hypertension: 'Stage 1 hypertension',
    stage_2_hypertension: 'Stage 2 hypertension',
  };
  return map[status] ?? status;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function computeStreak(records: { submitted_at: string }[]): number {
  if (records.length === 0) return 0;
  const dates = new Set(records.map((r) => new Date(r.submitted_at).toDateString()));
  let streak = 0;
  const checking = new Date();
  if (!dates.has(checking.toDateString())) {
    checking.setDate(checking.getDate() - 1);
  }
  while (dates.has(checking.toDateString())) {
    streak++;
    checking.setDate(checking.getDate() - 1);
  }
  return streak;
}

export function isTodayRecord(submitted_at: string): boolean {
  return new Date(submitted_at).toDateString() === new Date().toDateString();
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}
