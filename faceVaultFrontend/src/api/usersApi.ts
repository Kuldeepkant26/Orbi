const BASE_URL = 'https://orbi-production.up.railway.app/api/users';

export type UserItem = {
  _id: string;
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
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
