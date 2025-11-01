const { query } = require('../lib/db');

function checkAuth(req) {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const authHeader = req.headers.authorization;
  return authHeader === `Bearer ${password}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET - List all partners
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM partners ORDER BY name');
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching partners:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // POST - Add new partner
  if (req.method === 'POST') {
    try {
      const { name, domain } = req.body;

      if (!name || !domain) {
        return res.status(400).json({ error: 'Name and domain are required' });
      }

      const result = await query(
        'INSERT INTO partners (name, domain) VALUES ($1, $2) RETURNING *',
        [name, domain]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating partner:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
