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
