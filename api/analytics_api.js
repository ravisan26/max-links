const { query } = require('../lib/db');

function checkAuth(req) {
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const authHeader = req.headers.authorization;
  return authHeader === `Bearer ${password}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Extract code from URL path
    const code = req.url.split('/').pop().split('?')[0];

    // Get total clicks
    const totalResult = await query(
      'SELECT clicks FROM urls WHERE code = $1',
      [code]
    );

    if (totalResult.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    // Get top countries
    const countriesResult = await query(`
      SELECT country, COUNT(*) as count
      FROM clicks
      WHERE code = $1 AND country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `, [code]);

    // Get device breakdown
    const devicesResult = await query(`
      SELECT device, COUNT(*) as count
      FROM clicks
      WHERE code = $1 AND device IS NOT NULL
      GROUP BY device
      ORDER BY count DESC
    `, [code]);

    // Get recent clicks (last 50)
    const recentResult = await query(`
      SELECT *
      FROM clicks
      WHERE code = $1
      ORDER BY clicked_at DESC
      LIMIT 50
    `, [code]);

    // Get bypass attempts
    const bypassResult = await query(`
      SELECT COUNT(*) as count, MAX(detected_at) as latest
      FROM bypass_logs
      WHERE code = $1
    `, [code]);

    return res.status(200).json({
      totalClicks: totalResult.rows[0].clicks,
      topCountries: countriesResult.rows,
      devices: devicesResult.rows,
      recentClicks: recentResult.rows,
      bypassAttempts: {
        count: parseInt(bypassResult.rows[0].count),
        latest: bypassResult.rows[0].latest
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ error: 'Database error' });
  }
};