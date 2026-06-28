// ── Reports API (user-facing) ─────────────────────────────────────────────────
//
// Submit an issue/suggestion and view your own reports + any admin reply.

const BASE_URL = 'https://orbi-production.up.railway.app/api/reports';

export type MyReport = {
  _id: string;
  category: string;
  message: string;
  status: 'open' | 'resolved';
  adminReply: string;
  createdAt: string;
};

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// Submit a new report.
export async function apiCreateReport(
  token: string,
  category: string,
  message: string,
): Promise<MyReport> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ category, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit report');
  return data;
}

// Fetch my reports (and mark any admin replies as seen).
export async function apiFetchMyReports(token: string): Promise<MyReport[]> {
  const res = await fetch(`${BASE_URL}/mine`, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load reports');
  return data;
}
