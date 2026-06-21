import { Platform } from 'react-native';

const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8080/api/auth'
    : 'http://192.168.31.112:8080/api/auth';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

export async function apiLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

export async function apiSignup(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Signup failed');
  return data;
}
