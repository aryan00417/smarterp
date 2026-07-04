const pool = require('../db/pool');

const verifyCompany = async (companyId, userId) => {
  const r = await pool.query('SELECT id FROM companies WHERE id=$1 AND user_id=$2', [companyId, userId]);
  return r.rows.length > 0;
};

const getLedgers = async (req, res) => {
  const { companyId } = req.params;
  const { type, search } = req.query;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    let query = `SELECT l.*, lg.name AS group_name, lg.nature FROM ledgers l
      JOIN ledger_groups lg ON l.group_id = lg.id WHERE l.company_id = $1`;
    const params = [companyId];
    if (type) { params.push(type); query += ` AND l.type = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND l.name ILIKE $${params.length}`; }
    query += ' ORDER BY l.name';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const getLedger = async (req, res) => {
  const { companyId, id } = req.params;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    const result = await pool.query(
      `SELECT l.*, lg.name AS group_name FROM ledgers l JOIN ledger_groups lg ON l.group_id=lg.id
       WHERE l.id=$1 AND l.company_id=$2`, [id, companyId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Ledger not found' });
    return res.json(result.rows[0]);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const createLedger = async (req, res) => {
  const { companyId } = req.params;
  const { name, type, group_id, phone, address, gstin, opening_balance } = req.body;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  if (!name || !type || !group_id) return res.status(400).json({ message: 'Name, type and group are required' });
  try {
    const ob = parseFloat(opening_balance) || 0;
    const result = await pool.query(
      `INSERT INTO ledgers (company_id,name,type,group_id,phone,address,gstin,opening_balance,balance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [companyId, name.trim(), type, group_id, phone, address, gstin, ob]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Ledger name already exists' });
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateLedger = async (req, res) => {
  const { companyId, id } = req.params;
  const { name, type, group_id, phone, address, gstin, opening_balance } = req.body;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    const result = await pool.query(
      `UPDATE ledgers SET name=$1,type=$2,group_id=$3,phone=$4,address=$5,gstin=$6,opening_balance=$7
       WHERE id=$8 AND company_id=$9 RETURNING *`,
      [name, type, group_id, phone, address, gstin, opening_balance || 0, id, companyId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Ledger not found' });
    return res.json(result.rows[0]);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const deleteLedger = async (req, res) => {
  const { companyId, id } = req.params;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    const used = await pool.query('SELECT id FROM vouchers WHERE ledger_id=$1 LIMIT 1', [id]);
    if (used.rows.length > 0) return res.status(400).json({ message: 'Cannot delete — ledger has voucher entries' });
    const result = await pool.query(
      'DELETE FROM ledgers WHERE id=$1 AND company_id=$2 RETURNING id', [id, companyId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Ledger not found' });
    return res.json({ message: 'Ledger deleted' });
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const getLedgerGroups = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ledger_groups ORDER BY nature, name');
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getLedgers, getLedger, createLedger, updateLedger, deleteLedger, getLedgerGroups };