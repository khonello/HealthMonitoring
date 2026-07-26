export type FeedbackCategory =
  | 'triage_accuracy'
  | 'bug'
  | 'usability'
  | 'suggestion'
  | 'other';

export type FeedbackStatus = 'new' | 'reviewed' | 'resolved';

export interface Feedback {
  id: number;
  category: FeedbackCategory;
  message: string;
  rating: number | null;
  health_record: number | null;
  status: FeedbackStatus;
  created_at: string;
}

export interface FeedbackSubmitPayload {
  category: FeedbackCategory;
  message: string;
  rating?: number | null;
  health_record?: number | null;
  app_version?: string;
  platform?: string;
}

export interface AdminFeedback extends Feedback {
  user_id: number;
  user_email: string;
  user_full_name: string;
  app_version: string;
  platform: string;
  admin_note: string;
  updated_at: string;
}

export interface AdminFeedbackFilters {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
}

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  triage_accuracy: 'Triage accuracy',
  bug: 'Bug or error',
  usability: 'Hard to use',
  suggestion: 'Suggestion',
  other: 'Something else',
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
};

/** Mirrors MIN_MESSAGE_LENGTH / MAX_MESSAGE_LENGTH in the backend serializer. */
export const FEEDBACK_MIN_LENGTH = 10;
export const FEEDBACK_MAX_LENGTH = 2000;
