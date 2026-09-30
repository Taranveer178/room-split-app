import { clearAdminSessionCookie, isSameOrigin } from '../../server/adminSession.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Origin not allowed' });

  clearAdminSessionCookie(res);
  return res.status(200).json({ authenticated: false });
}
