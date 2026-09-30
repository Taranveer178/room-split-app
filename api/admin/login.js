import {
  hasAdminCredentials,
  isSameOrigin,
  matchesAdminCredentials,
  setAdminSessionCookie,
} from '../../server/adminSession.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Origin not allowed' });
  if (!hasAdminCredentials()) return res.status(503).json({ error: 'Admin login is not configured' });

  const { username, password } = req.body || {};
  if (!matchesAdminCredentials(username, password)) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  try {
    setAdminSessionCookie(res);
    return res.status(200).json({ authenticated: true, username: process.env.ADMIN_USERNAME });
  } catch (error) {
    console.error('Could not create admin session:', error);
    return res.status(500).json({ error: 'Could not create admin session' });
  }
}
