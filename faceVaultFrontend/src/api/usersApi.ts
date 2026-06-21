import { Platform } from 'react-native';

const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8080/api/users'
    : 'http://192.168.31.112:8080/api/users';

export type UserItem = {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type Message = {
  _id: string;
  sender: string;
  receiver: string;
  text: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
};

// Fetch list of all users (except yourself)
export async function apiFetchUsers(token: string): Promise<UserItem[]> {
  const res = await fetch(BASE_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch users');
  return data;
}

// Fetch conversation with a specific user
export async function apiFetchMessages(
  token: string,
  otherUserId: string
): Promise<Message[]> {
  const res = await fetch(`${BASE_URL}/messages/${otherUserId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch messages');
  return data;
}
