export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say' | '';

export interface User {
  id: number;
  email: string;
  full_name: string;
  date_of_birth: string | null;
  gender: Gender;
  created_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: Gender;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}
