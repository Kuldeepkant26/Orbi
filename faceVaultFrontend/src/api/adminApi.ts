// ── Admin API ─────────────────────────────────────────────────────────────────
//
// Superadmin-only calls: list/ban/unban users, list/hide/delete posts. The
// backend rejects these unless the token belongs to a superadmin.

const BASE_URL = 'https://orbi-production.up.railway.app/api/admin';

export type AdminUser = {
  _id: string;
  firstName: string;
  lastName?: string;
  name: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  role: string;
  isBanned: boolean;
  banReason?: string;
  banExpires?: string | null;
  isDeleted?: boolean;
  createdAt: string;
};

// Detailed user view (admin user-detail screen).
export type AdminUserDetail = AdminUser & {
  bio?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
};

// A user-submitted report (admin view, reporter populated).
export type AdminReport = {
  _id: string;
  reporter: {
    _id: string;
    name?: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
  category: string;
  message: string;
  status: 'open' | 'resolved';
  adminReply: string;
  createdAt: string;
};

export type AdminPost = {
  _id: string;
  author: {
    _id: string;
    firstName?: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
  };
  imageUrl: string;
  caption: string;
  isHidden: boolean;
  createdAt: string;
};

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── Users ──────────────────────────────────────────────────────────────────
export async function apiAdminListUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(`${BASE_URL}/users`, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load users');
  return data;
}

// durationDays: 1 | 7 | 30 | null (null = permanent)
export async function apiAdminBanUser(
  token: string,
  userId: string,
  reason: string,
  durationDays: number | null,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}/ban`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ reason, durationDays }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to ban user');
  }
}

export async function apiAdminUnbanUser(
  token: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}/unban`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to unban user');
  }
}

// ── Posts ──────────────────────────────────────────────────────────────────
export async function apiAdminListPosts(token: string): Promise<AdminPost[]> {
  const res = await fetch(`${BASE_URL}/posts`, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load posts');
  return data;
}

export async function apiAdminSetPostHidden(
  token: string,
  postId: string,
  hidden: boolean,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/posts/${postId}/hide`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ hidden }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to update post');
  }
}

export async function apiAdminDeletePost(
  token: string,
  postId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/posts/${postId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to delete post');
  }
}

// ── User detail + soft delete / restore ──────────────────────────────────────
export async function apiAdminUserDetail(
  token: string,
  userId: string,
): Promise<AdminUserDetail> {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load user');
  return data;
}

export async function apiAdminDeleteUser(
  token: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}/delete`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to delete account');
  }
}

export async function apiAdminRestoreUser(
  token: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}/restore`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to restore account');
  }
}

// ── Reports (admin) ──────────────────────────────────────────────────────────
export async function apiAdminListReports(token: string): Promise<AdminReport[]> {
  const res = await fetch(`${BASE_URL}/reports`, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load reports');
  return data;
}

export async function apiAdminReplyReport(
  token: string,
  reportId: string,
  reply: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/reports/${reportId}/reply`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ reply }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to send reply');
  }
}
