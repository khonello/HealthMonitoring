import { Colors } from '@/constants/colors';
import { TriageLevel, UrgencyLevel } from '@/types/health';

export type CardAccent = typeof Colors.normal;

export function pickAccent(level?: TriageLevel | null, urgency?: UrgencyLevel | null): CardAccent {
  if (!level) return Colors.normal;
  switch (level) {
    case 'see_doctor':
      return urgency === 'high' ? Colors.critical : Colors.alert;
    case 'visit_pharmacy':
      return Colors.caution;
    case 'rest_at_home':
    default:
      return Colors.normal;
  }
}
