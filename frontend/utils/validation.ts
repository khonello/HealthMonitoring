export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Must be at least 8 characters';
  return null;
}

export function validateFullName(name: string): string | null {
  if (!name.trim()) return 'Full name is required';
  if (name.trim().length < 2) return 'Enter your full name';
  return null;
}

export const MIN_AGE_YEARS = 13;
export const MAX_AGE_YEARS = 120;

/** Latest allowable date of birth (i.e. must be at least MIN_AGE_YEARS old). */
export function maxDobDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
  return d;
}

/** Earliest allowable date of birth (sanity cap at MAX_AGE_YEARS). */
export function minDobDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setFullYear(d.getFullYear() - MAX_AGE_YEARS);
  return d;
}

/**
 * Validates an optional `YYYY-MM-DD` date of birth. Empty/null is allowed
 * (the field is optional); a provided date must be real, not in the future,
 * and fall within [MIN_AGE_YEARS, MAX_AGE_YEARS].
 */
export function validateDateOfBirth(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return 'Enter a valid date';
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dob = new Date(year, month - 1, day);
  // Reject overflow dates like 2021-02-31 that JS silently rolls forward.
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return 'Enter a valid date';
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob.getTime() > today.getTime()) return 'Date of birth cannot be in the future';

  let age = today.getFullYear() - year;
  const hadBirthdayThisYear =
    today.getMonth() > month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() >= day);
  if (!hadBirthdayThisYear) age -= 1;

  if (age < MIN_AGE_YEARS) return `You must be at least ${MIN_AGE_YEARS} years old`;
  if (age > MAX_AGE_YEARS) return 'Enter a valid date of birth';
  return null;
}

export function validateTemperature(val: string): string | null {
  const n = parseFloat(val);
  if (isNaN(n)) return 'Enter a valid number';
  if (n < 30 || n > 45) return 'Expected 30 – 45 °C';
  return null;
}

export function validateHeartRate(val: string): string | null {
  const n = parseInt(val, 10);
  if (isNaN(n)) return 'Enter a valid number';
  if (n < 20 || n > 300) return 'Expected 20 – 300 bpm';
  return null;
}

export function validateSpO2(val: string): string | null {
  const n = parseFloat(val);
  if (isNaN(n)) return 'Enter a valid number';
  if (n < 50 || n > 100) return 'Expected 50 – 100 %';
  return null;
}

export function validateBP(val: string): string | null {
  const n = parseInt(val, 10);
  if (isNaN(n)) return 'Enter a valid number';
  if (n < 40 || n > 300) return 'Expected 40 – 300 mmHg';
  return null;
}

export function parseFloat_(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export function parseInt_(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}
