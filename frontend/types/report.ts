import { TriageLevel, UrgencyLevel, InputConfidence } from './health';

export type ReadingStatus =
  | 'normal'
  | 'mildly_elevated'
  | 'borderline_elevated'
  | 'elevated'
  | 'low'
  | 'high'
  | 'critical'
  | 'stage_1_hypertension'
  | 'stage_2_hypertension';

export interface ReadingSummaryItem {
  value: number | string;
  unit: string;
  status: ReadingStatus;
}

export interface ReadingsSummary {
  temperature?: ReadingSummaryItem;
  heart_rate?: ReadingSummaryItem;
  spo2?: ReadingSummaryItem;
  blood_pressure?: ReadingSummaryItem;
}

export interface SubmitTriage {
  level: TriageLevel;
  urgency: UrgencyLevel;
  confidence: InputConfidence;
  hard_rule_triggered: boolean;
  recommendation: string;
  follow_up_flag: boolean;
  follow_up_in_hours: number | null;
  disclaimer: string;
  fallback?: boolean;
}

export interface SubmitResponse {
  report_id: number;
  triage: SubmitTriage;
  readings_summary: ReadingsSummary;
  generated_at: string;
}

export interface TriageResult {
  id: number;
  triage_level: TriageLevel;
  urgency: UrgencyLevel;
  confidence_level: InputConfidence;
  hard_rule_triggered: boolean;
  hard_rule_metric: string | null;
  recommendation_text: string;
  follow_up_flag: boolean;
  follow_up_hours: number | null;
  llm_model_used: string | null;
  generated_at: string;
}

export interface HealthReport {
  id: number;
  triage: TriageResult;
  readings_summary: ReadingsSummary;
  disclaimer_text: string;
  generated_at: string;
}
