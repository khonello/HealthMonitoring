import { TriageLevel, UrgencyLevel, InputConfidence, InputMode } from './health';

export type TriageOversightFilter = 'critical_urgent' | 'hard_rule' | 'low_confidence';

export interface AdminTriageResult {
  id: number;
  health_record_id: number;
  user_id: number;
  user_email: string;
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

export type LLMFailureSource = 'triage' | 'retry' | 'health_tip';

export interface LLMFailureLog {
  id: number;
  health_record_id: number | null;
  user_id: number | null;
  user_email: string | null;
  source: LLMFailureSource;
  error_type: string;
  error_message: string;
  occurred_at: string;
}

export interface AdminSummary {
  total_users: number;
  critical_last_24h: number;
  hard_rule_last_24h: number;
  low_confidence_last_24h: number;
  llm_failures_last_24h: number;
  new_feedback: number;
}

export interface AdminRecordTriage {
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

export interface AdminHealthRecord {
  id: number;
  input_mode: InputMode;
  input_confidence: InputConfidence;
  submitted_at: string;
  temperature: number | null;
  heart_rate: number | null;
  spo2: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  symptom_description: string | null;
  triage: AdminRecordTriage | null;
}

export interface LLMStats {
  total: number;
  last_24h: number;
  last_7d: number;
  by_source: { source: LLMFailureSource; count: number }[];
  by_error_type: { error_type: string; count: number }[];
}

export interface AdminUserSummary {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
  has_recent_critical: boolean;
}

export interface AdminUserDetail extends AdminUserSummary {
  date_of_birth: string | null;
  gender: string;
  health_records: AdminHealthRecord[];
  llm_failures: LLMFailureLog[];
}

export interface SafetyThreshold {
  id: number;
  metric: string;
  operator: 'gt' | 'lt' | 'outside_range';
  value: number;
  value_high: number | null;
  description: string;
  updated_at: string;
}

export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
