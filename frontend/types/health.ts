export type InputMode = 'structured' | 'descriptive' | 'mixed';
export type InputConfidence = 'high' | 'medium' | 'low';
export type TriageLevel = 'see_doctor' | 'visit_pharmacy' | 'rest_at_home';
export type UrgencyLevel = 'low' | 'medium' | 'high';

export interface TriageSummary {
  level: TriageLevel;
  urgency: UrgencyLevel;
  confidence: InputConfidence;
  recommendation: string;
  follow_up_flag: boolean;
  follow_up_in_hours: number | null;
  generated_at: string;
}

export interface HealthRecord {
  id: number;
  input_mode: InputMode;
  input_confidence: InputConfidence;
  submitted_at: string;
  temperature: number | null;
  heart_rate: number | null;
  spo2: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  triage: TriageSummary | null;
}

export interface HealthSubmitPayload {
  temperature?: number | null;
  heart_rate?: number | null;
  spo2?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  symptom_description?: string | null;
}
