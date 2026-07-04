const pool = require('../db/pool');

const verifyCompany = async (companyId, userId) => {
  const r = await pool.query('SELECT id FROM companies WHERE id=$1 AND user_id=$2', [companyId, userId]);
  return r.rows.length > 0;
};

const getStockItems = async (req, res) => {
  const { companyId } = req.params;
  const { search } = req.query;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    let query = `SELECT s.*, u.symbol AS unit_symbol FROM stock_items s
      LEFT JOIN units u ON s.unit_id = u.id WHERE s.company_id = $1`;
    const params = [companyId];
    if (search) { params.push(`%${search}%`); query += ` AND s.name ILIKE $${params.length}`; }
    query += ' ORDER BY s.name';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const getStockItem = async (req, res) => {
  const { companyId, id } = req.params;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    const result = await pool.query(
      `SELECT s.*, u.symbol AS unit_symbol FROM stock_items s
       LEFT JOIN units u ON s.unit_id=u.id WHERE s.id=$1 AND s.company_id=$2`, [id, companyId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Item not found' });
    return res.json(result.rows[0]);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const createStockItem = async (req, res) => {
  const { companyId } = req.params;
  const { name, sku, unit_id, purchase_price, selling_price, gst_rate, opening_qty } = req.body;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  if (!name) return res.status(400).json({ message: 'Item name is required' });
  try {
    const oq = parseFloat(opening_qty) || 0;
    const result = await pool.query(
      `INSERT INTO stock_items (company_id,name,sku,unit_id,purchase_price,selling_price,gst_rate,opening_qty,current_qty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [companyId, name.trim(), sku, unit_id, purchase_price||0, selling_price||0, gst_rate||0, oq]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Item name already exists' });
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateStockItem = async (req, res) => {
  const { companyId, id } = req.params;
  const { name, sku, unit_id, purchase_price, selling_price, gst_rate } = req.body;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    const result = await pool.query(
      `UPDATE stock_items SET name=$1,sku=$2,unit_id=$3,purchase_price=$4,selling_price=$5,gst_rate=$6
       WHERE id=$7 AND company_id=$8 RETURNING *`,
      [name, sku, unit_id, purchase_price||0, selling_price||0, gst_rate||0, id, companyId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Item not found' });
    return res.json(result.rows[0]);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const deleteStockItem = async (req, res) => {
  const { companyId, id } = req.params;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    const used = await pool.query('SELECT id FROM voucher_items WHERE stock_item_id=$1 LIMIT 1', [id]);
    if (used.rows.length > 0) return res.status(400).json({ message: 'Cannot delete — item has voucher entries' });
    const result = await pool.query(
      'DELETE FROM stock_items WHERE id=$1 AND company_id=$2 RETURNING id', [id, companyId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Item not found' });
    return res.json({ message: 'Stock item deleted' });
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const getUnits = async (req, res) => {
  const { companyId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM units WHERE company_id=$1 ORDER BY symbol', [companyId]);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getStockItems, getStockItem, createStockItem, updateStockItem, deleteStockItem, getUnits };