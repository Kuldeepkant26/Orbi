// ── Highlights API ────────────────────────────────────────────────────────────

const BASE_URL = 'https://orbi-production.up.railway.app/api/highlights';

export type HighlightItem = { imageUrl: string; caption?: string; addedAt?: string };

export type Highlight = {
  _id: string;
  owner: string;
  title: string;
  coverUrl: string;
  items: HighlightItem[];
  createdAt: string;
};

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function apiCreateHighlight(
  token: string,
  title: string,
  items: HighlightItem[],
): Promise<Highlight> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title, items }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create highlight');
  return data;
}

export async function apiAddToHighlight(
  token: string,
  highlightId: string,
  item: HighlightItem,
): Promise<Highlight> {
  const res = await fetch(`${BASE_URL}/${highlightId}/items`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add to highlight');
  return data;
}

export async function apiFetchUserHighlights(
  token: string,
  userId: string,
): Promise<Highlight[]> {
  const res = await fetch(`${BASE_URL}/user/${userId}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load highlights');
  return data;
}

export async function apiDeleteHighlight(
  token: string,
  highlightId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/${highlightId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to delete highlight');
  }
}
