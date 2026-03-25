// Data API — bridge between dashboard and Supabase
// GET /api/data?table=tasks|agents|notifications|activity_log|sprints&select=*&limit=100&order=created_at.desc&filter=status=eq.running
// POST /api/data — { table, action: 'insert'|'update'|'upsert'|'delete', data, match }
// PATCH /api/data — { table, data, match }
// DELETE /api/data — { table, match }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const ALLOWED_TABLES = ['tasks', 'agents', 'notifications', 'activity_log', 'sprints'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  const text = await res.text();
  try { return { data: JSON.parse(text), status: res.status }; } catch { return { data: text, status: res.status }; }
}

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    return res.end();
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  try {
    if (req.method === 'GET') {
      const table = req.query.table;
      if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ error: 'Invalid table. Allowed: ' + ALLOWED_TABLES.join(', ') });
      }
      const select = req.query.select || '*';
      const limit = parseInt(req.query.limit) || 200;
      const order = req.query.order || 'created_at.desc';
      const filter = req.query.filter || '';

      const path = `${table}?select=${encodeURIComponent(select)}&order=${order}&limit=${limit}${filter ? '&' + filter : ''}`;
      const { data } = await supaFetch(path);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { table, action, data, match } = req.body;
      if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ error: 'Invalid table' });
      }

      if (action === 'insert') {
        const result = await supaFetch(table, { method: 'POST', body: JSON.stringify(data) });
        return res.status(201).json(result.data);
      }

      if (action === 'upsert') {
        const result = await supaFetch(table, {
          method: 'POST',
          body: JSON.stringify(data),
          prefer: 'return=representation,resolution=merge-duplicates',
        });
        return res.status(200).json(result.data);
      }

      if (action === 'update') {
        const result = await supaFetch(`${table}?${match}`, { method: 'PATCH', body: JSON.stringify(data) });
        return res.status(200).json(result.data);
      }

      if (action === 'delete') {
        const result = await supaFetch(`${table}?${match}`, { method: 'DELETE' });
        return res.status(200).json(result.data);
      }

      return res.status(400).json({ error: 'Invalid action. Allowed: insert, upsert, update, delete' });
    }

    if (req.method === 'PATCH') {
      const { table, data, match } = req.body;
      if (!ALLOWED_TABLES.includes(table)) {
        return res.status(400).json({ error: 'Invalid table' });
      }
      const result = await supaFetch(`${table}?${match}`, { method: 'PATCH', body: JSON.stringify(data) });
      return res.status(200).json(result.data);
    }

    if (req.method === 'DELETE') {
      const { table, match } = req.body || {};
      const qTable = req.query.table || table;
      const qMatch = req.query.match || match;
      if (!ALLOWED_TABLES.includes(qTable)) {
        return res.status(400).json({ error: 'Invalid table' });
      }
      const result = await supaFetch(`${qTable}?${qMatch}`, { method: 'DELETE' });
      return res.status(200).json(result.data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
