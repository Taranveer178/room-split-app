import { getAdminSession, hasAdminCredentials } from '../../server/adminSession.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasAdminCredentials()) return res.status(503).json({ error: 'Admin login is not configured' });

  const session = getAdminSession(req);
  if (!session) return res.status(200).json({ authenticated: false });
  return res.status(200).json({ authenticated: true, username: session.username });
}
