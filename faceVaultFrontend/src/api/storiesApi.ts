// ── Stories API ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://orbi-production.up.railway.app/api/stories';

export type StoryAuthor = {
  _id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
};

// One entry in the story tray (an author who has active stories).
export type StoryTrayItem = {
  author: StoryAuthor;
  count: number;
  allSeen: boolean;
  latestAt: string;
};

// A single story (in the viewer).
export type Story = {
  _id: string;
  author: StoryAuthor;
  imageUrl: string;
  caption: string;
  createdAt: string;
  expiresAt: string;
  likesCount: number;
  likedByMe: boolean;
  viewsCount: number;
  isMine: boolean;
};

export type StoryViewer = {
  _id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  liked: boolean;
};

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function apiCreateStory(
  token: string,
  body: { imageUrl: string; caption?: string; durationHours: number },
): Promise<{ _id: string }> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to post story');
  return data;
}

export async function apiFetchStoryTray(token: string): Promise<StoryTrayItem[]> {
  const res = await fetch(`${BASE_URL}/feed`, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load stories');
  return data;
}

export async function apiFetchUserStories(
  token: string,
  userId: string,
): Promise<Story[]> {
  const res = await fetch(`${BASE_URL}/user/${userId}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load stories');
  return data;
}

export async function apiFetchMyStories(token: string): Promise<Story[]> {
  const res = await fetch(`${BASE_URL}/mine`, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load stories');
  return data;
}

export async function apiViewStory(token: string, storyId: string): Promise<void> {
  await fetch(`${BASE_URL}/${storyId}/view`, {
    method: 'POST',
    headers: authHeaders(token),
  }).catch(() => {});
}

export async function apiLikeStory(
  token: string,
  storyId: string,
  like: boolean,
): Promise<{ likesCount: number; likedByMe: boolean }> {
  const res = await fetch(`${BASE_URL}/${storyId}/like`, {
    method: like ? 'POST' : 'DELETE',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to like story');
  return data;
}

export async function apiFetchStoryViewers(
  token: string,
  storyId: string,
): Promise<{ viewsCount: number; viewers: StoryViewer[] }> {
  const res = await fetch(`${BASE_URL}/${storyId}/viewers`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load viewers');
  return data;
}

export async function apiDeleteStory(token: string, storyId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${storyId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to delete story');
  }
}
