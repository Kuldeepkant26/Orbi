const BASE_URL = 'https://orbi-production.up.railway.app/api/auth';

export type AuthUser = {
  id: string;
  firstName: string;
  lastName?: string;
  name: string; // derived "First Last" — kept for display fallback
  email: string;
  // Social fields added for Orbi. Older sessions may not have these yet, so
  // they're optional and the app treats missing values as empty.
  username?: string;
  avatarUrl?: string;
  bio?: string;
  // 'user' or 'superadmin'. Drives whether admin options show.
  role?: string;
};

// A successful login / OTP verification returns a token + user.
type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

// Signup (and a login that hits an unverified account) returns this instead:
// the account needs email verification before it can be used.
type VerificationResponse = {
  message: string;
  needsVerification: true;
  email: string;
};

// A login attempt by a banned user returns this (HTTP 403) instead of a token.
export type BannedResponse = {
  message: string;
  banned: true;
  banReason: string;
  banExpires: string | null; // null = permanent
};

// apiLogin can return a real auth response, a "needs verification" response, or
// a "banned" response. The caller checks the flags to decide what to show.
export type LoginResult = AuthResponse | VerificationResponse | BannedResponse;

export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResult> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();

  // Both "not verified" and "banned" come back as 403 with a distinguishing flag.
  if (res.status === 403 && data.needsVerification) {
    return data as VerificationResponse;
  }
  if (res.status === 403 && data.banned) {
    return data as BannedResponse;
  }
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data as AuthResponse;
}

// Signup creates an unverified account and emails an OTP. No token yet.
export async function apiSignup(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
): Promise<VerificationResponse> {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Signup failed');
  return data as VerificationResponse;
}

// Verify the 6-digit code. On success the account is active and we get a token.
export async function apiVerifyOtp(
  email: string,
  code: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Verification failed');
  return data as AuthResponse;
}

// Ask the server to email a fresh code.
export async function apiResendOtp(email: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Could not resend code');
  return data;
}

// Small helpers so screens can check which kind of result they got.
export function isVerificationResponse(
  r: LoginResult,
): r is VerificationResponse {
  return (r as VerificationResponse).needsVerification === true;
}

export function isBannedResponse(r: LoginResult): r is BannedResponse {
  return (r as BannedResponse).banned === true;
}
