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

export type Reaction = { user: string; emoji: string };

export type Message = {
  _id: string;
  sender: string;
  receiver: string;
  text: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  reactions?: Reaction[];
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

// A recent conversation in the DM list.
export type Conversation = {
  user: {
    _id: string;
    name: string;
    username?: string;
    email: string;
    avatarUrl?: string;
  };
  lastMessage: {
    text: string;
    createdAt: string;
    fromMe: boolean;
  };
  unreadCount: number;
};

// Fetch my recent chats (people I've messaged), newest first.
export async function apiFetchConversations(
  token: string,
): Promise<Conversation[]> {
  const res = await fetch(`${BASE_URL}/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load chats');
  return data;
}

// Fetch the total unread message count + a per-sender breakdown (for badges).
export async function apiFetchUnreadMessageCount(
  token: string,
): Promise<{ count: number; bySender: Record<string, number> }> {
  const res = await fetch(`${BASE_URL}/messages/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load unread count');
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
