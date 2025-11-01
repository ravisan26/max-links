const { query } = require('../lib/db');

// Generate random 6-character code
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check authentication
function checkAuth(req) {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const authHeader = req.headers.authorization;
  
  if (!authHeader || authHeader !== `Bearer ${password}`) {
    return false;
  }
  return true;
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - List all URLs
  if (req.method === 'GET') {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await query(`
        SELECT u.*, p.name as partner_name, p.domain as partner_domain
        FROM urls u
        LEFT JOIN partners p ON u.partner_id = p.id
        ORDER BY u.created DESC
      `);
      
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching URLs:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // POST - Create new URL
  if (req.method === 'POST') {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { url, code: customCode, partner_id, referrer_url, expires_at } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Generate or use custom code
      let code = customCode || generateCode();
      
      // Check if code already exists
      const existingCheck = await query('SELECT code FROM urls WHERE code = $1', [code]);
      if (existingCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Code already exists' });
      }

      // Insert new URL
      const result = await query(
        'INSERT INTO urls (code, url, partner_id, referrer_url, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [code, url, partner_id || null, referrer_url || null, expires_at || null]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating URL:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // PUT - Update URL
  if (req.method === 'PUT') {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const code = req.url.split('/').pop();
      const { url, partner_id, referrer_url, expires_at } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Update URL
      const result = await query(
        'UPDATE urls SET url = $1, partner_id = $2, referrer_url = $3, expires_at = $4 WHERE code = $5 RETURNING *',
        [url, partner_id || null, referrer_url || null, expires_at || null, code]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'URL not found' });
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Error updating URL:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // DELETE - Delete URL
  if (req.method === 'DELETE') {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const code = req.url.split('/').pop();
      
      await query('DELETE FROM urls WHERE code = $1', [code]);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting URL:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
