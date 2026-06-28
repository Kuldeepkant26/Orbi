// ── Social API ────────────────────────────────────────────────────────────────
//
// Follow/unfollow, fetching a user's profile, updating your own profile, and
// notifications. Same plain-fetch style as the other API modules.

const USERS_URL = 'https://orbi-production.up.railway.app/api/users';
const SOCIAL_URL = 'https://orbi-production.up.railway.app/api/social';
const NOTIF_URL = 'https://orbi-production.up.railway.app/api/notifications';

// The full profile payload (from userController.getProfile).
export type Profile = {
  _id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string;
  bio: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  isMe: boolean;
  createdAt: string;
};

// A notification (from socialController.getNotifications).
export type AppNotification = {
  _id: string;
  recipient: string;
  actor: { _id: string; name: string; username?: string; avatarUrl?: string };
  type: 'follow' | 'like' | 'comment';
  post?: string;
  isRead: boolean;
  createdAt: string;
};

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// A person in a followers/following list.
export type Connection = {
  _id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
};

// GET a user's followers or following list. kind = 'followers' | 'following'.
export async function apiFetchConnections(
  token: string,
  userId: string,
  kind: 'followers' | 'following',
): Promise<Connection[]> {
  const res = await fetch(`${USERS_URL}/${userId}/${kind}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load list');
  return data;
}

// GET a user's public profile.
export async function apiFetchProfile(
  token: string,
  userId: string
): Promise<Profile> {
  const res = await fetch(`${USERS_URL}/${userId}/profile`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load profile');
  return data;
}

// PUT update my own profile (name / bio / avatarUrl).
export async function apiUpdateProfile(
  token: string,
  updates: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatarUrl?: string;
  }
): Promise<Profile> {
  const res = await fetch(`${USERS_URL}/me`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update profile');
  return data;
}

// POST/DELETE follow. Returns whether you now follow them.
export async function apiToggleFollow(
  token: string,
  userId: string,
  follow: boolean
): Promise<{ following: boolean }> {
  const res = await fetch(`${SOCIAL_URL}/follow/${userId}`, {
    method: follow ? 'POST' : 'DELETE',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update follow');
  return data;
}

// GET my notifications.
export async function apiFetchNotifications(
  token: string
): Promise<AppNotification[]> {
  const res = await fetch(NOTIF_URL, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load notifications');
  return data;
}

// GET my unread notification count (for the badge).
export async function apiFetchUnreadNotificationCount(
  token: string,
): Promise<number> {
  const res = await fetch(`${NOTIF_URL}/unread-count`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load count');
  return data.count || 0;
}

// POST mark all my notifications as read.
export async function apiMarkNotificationsRead(token: string): Promise<void> {
  const res = await fetch(`${NOTIF_URL}/read`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to mark read');
  }
}
