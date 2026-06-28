// ── Posts API ─────────────────────────────────────────────────────────────────
//
// All the network calls related to posts: feed, a user's posts, creating a
// post, liking, and comments. Mirrors the style of usersApi.ts — plain fetch
// with a Bearer token.

const BASE_URL = 'https://orbi-production.up.railway.app/api/posts';

// The author info bundled with each post.
export type PostAuthor = {
  _id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
};

// A post as shaped by the backend (see postController.shapePost).
export type Post = {
  _id: string;
  author: PostAuthor;
  imageUrl: string; // first image (legacy / single-image)
  imageUrls?: string[]; // all images for the carousel
  caption: string;
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  createdAt: string;
};

// A comment on a post (may be a reply via `parent`).
export type Comment = {
  _id: string;
  post: string;
  author: PostAuthor;
  text: string;
  parent: string | null;
  isPinned: boolean;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
};

// Small helper so every call sends the auth header the same way.
function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// GET feed (people you follow + your own posts), paginated.
export async function apiFetchFeed(token: string, page = 1): Promise<Post[]> {
  const res = await fetch(`${BASE_URL}/feed?page=${page}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load feed');
  return data;
}

// GET all posts by one user (for the profile grid).
export async function apiFetchUserPosts(
  token: string,
  userId: string
): Promise<Post[]> {
  const res = await fetch(`${BASE_URL}/user/${userId}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load posts');
  return data;
}

// GET a single post.
export async function apiFetchPost(token: string, postId: string): Promise<Post> {
  const res = await fetch(`${BASE_URL}/${postId}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load post');
  return data;
}

// POST create a new post. Images are optional (text-only posts allowed).
// Pass imageUrls for multi-image (carousel) posts; imageUrl still works for one.
export async function apiCreatePost(
  token: string,
  body: { imageUrl?: string; imageUrls?: string[]; caption?: string }
): Promise<Post> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create post');
  return data;
}

// A person who liked a post.
export type Liker = {
  _id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
};

// GET the list of people who liked a post.
export async function apiFetchPostLikers(
  token: string,
  postId: string
): Promise<Liker[]> {
  const res = await fetch(`${BASE_URL}/${postId}/likers`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load likes');
  return data;
}

// POST/DELETE like. Returns the new like count + whether you like it now.
export async function apiLikePost(
  token: string,
  postId: string,
  like: boolean
): Promise<{ likesCount: number; likedByMe: boolean }> {
  const res = await fetch(`${BASE_URL}/${postId}/like`, {
    method: like ? 'POST' : 'DELETE',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update like');
  return data;
}

// GET comments for a post.
export async function apiFetchComments(
  token: string,
  postId: string
): Promise<Comment[]> {
  const res = await fetch(`${BASE_URL}/${postId}/comments`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load comments');
  return data;
}

// POST a new comment, or a reply when parentId is given.
export async function apiAddComment(
  token: string,
  postId: string,
  text: string,
  parentId?: string | null
): Promise<Comment> {
  const res = await fetch(`${BASE_URL}/${postId}/comments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text, parentId: parentId || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add comment');
  return data;
}

// POST/DELETE like on a comment.
export async function apiLikeComment(
  token: string,
  commentId: string,
  like: boolean
): Promise<{ likesCount: number; likedByMe: boolean }> {
  const res = await fetch(`${BASE_URL}/comments/${commentId}/like`, {
    method: like ? 'POST' : 'DELETE',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to like comment');
  return data;
}

// POST pin / unpin a comment (post owner only).
export async function apiPinComment(
  token: string,
  commentId: string,
  pin: boolean
): Promise<{ isPinned: boolean }> {
  const res = await fetch(`${BASE_URL}/comments/${commentId}/pin`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to pin comment');
  return data;
}
