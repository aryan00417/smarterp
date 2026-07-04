const pool = require('../db/pool');

const verifyCompany = async (companyId, userId) => {
  const r = await pool.query('SELECT * FROM companies WHERE id=$1 AND user_id=$2', [companyId, userId]);
  return r.rows[0] || null;
};

const generateVoucherNo = async (client, companyId, type) => {
  const prefix = type === 'sales' ? 'SAL' : 'PUR';
  const year = new Date().getFullYear();
  const result = await client.query(
    'SELECT COUNT(*) FROM vouchers WHERE company_id=$1 AND type=$2', [companyId, type]
  );
  const seq = (parseInt(result.rows[0].count) + 1).toString().padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
};

const getVouchers = async (req, res) => {
  const { companyId } = req.params;
  const { type, search } = req.query;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    let query = `SELECT v.*, l.name AS party_name FROM vouchers v
      JOIN ledgers l ON v.ledger_id=l.id WHERE v.company_id=$1`;
    const params = [companyId];
    if (type) { params.push(type); query += ` AND v.type=$${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (v.voucher_no ILIKE $${params.length} OR l.name ILIKE $${params.length})`; }
    query += ' ORDER BY v.date DESC, v.created_at DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const getVoucher = async (req, res) => {
  const { companyId, id } = req.params;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  try {
    const vResult = await pool.query(
      `SELECT v.*, l.name AS party_name, l.gstin AS party_gstin, l.address AS party_address, l.phone AS party_phone
       FROM vouchers v JOIN ledgers l ON v.ledger_id=l.id WHERE v.id=$1 AND v.company_id=$2`, [id, companyId]
    );
    if (!vResult.rows.length) return res.status(404).json({ message: 'Voucher not found' });
    const iResult = await pool.query(
      `SELECT vi.*, s.name AS item_name, s.sku, u.symbol AS unit FROM voucher_items vi
       JOIN stock_items s ON vi.stock_item_id=s.id LEFT JOIN units u ON s.unit_id=u.id
       WHERE vi.voucher_id=$1`, [id]
    );
    return res.json({ ...vResult.rows[0], items: iResult.rows });
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const createVoucher = async (req, res) => {
  const { companyId } = req.params;
  const { type, date, ledger_id, narration, items, is_igst } = req.body;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  if (!type || !date || !ledger_id || !items?.length)
    return res.status(400).json({ message: 'Type, date, party and items are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let subtotal = 0, cgst = 0, sgst = 0, igst = 0;
    const processedItems = [];

    for (const item of items) {
      const qty = parseFloat(item.quantity);
      const rate = parseFloat(item.rate);
      if (!qty || !rate) continue;
      const amount = parseFloat((qty * rate).toFixed(2));
      const gstRate = parseFloat(item.gst_rate) || 0;
      const gstAmount = parseFloat(((amount * gstRate) / 100).toFixed(2));
      const total = parseFloat((amount + gstAmount).toFixed(2));
      subtotal += amount;
      if (is_igst) { igst += gstAmount; }
      else { cgst += parseFloat((gstAmount / 2).toFixed(2)); sgst += parseFloat((gstAmount / 2).toFixed(2)); }
      processedItems.push({ ...item, qty, rate, amount, gstRate, gstAmount, total });
    }

    if (!processedItems.length) throw new Error('No valid line items');

    subtotal = parseFloat(subtotal.toFixed(2));
    cgst = parseFloat(cgst.toFixed(2));
    sgst = parseFloat(sgst.toFixed(2));
    igst = parseFloat(igst.toFixed(2));
    const totalAmount = parseFloat((subtotal + cgst + sgst + igst).toFixed(2));
    const voucherNo = await generateVoucherNo(client, companyId, type);

    const vResult = await client.query(
      `INSERT INTO vouchers (company_id,type,voucher_no,date,ledger_id,narration,subtotal,cgst_amount,sgst_amount,igst_amount,total_amount,is_igst)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [companyId, type, voucherNo, date, ledger_id, narration, subtotal, cgst, sgst, igst, totalAmount, is_igst||false]
    );
    const voucher = vResult.rows[0];

    for (const item of processedItems) {
      await client.query(
        `INSERT INTO voucher_items (voucher_id,stock_item_id,quantity,rate,amount,gst_rate,gst_amount,total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [voucher.id, item.stock_item_id, item.qty, item.rate, item.amount, item.gstRate, item.gstAmount, item.total]
      );
      const qtyDelta = type === 'purchase' ? item.qty : -item.qty;
      await client.query(
        'UPDATE stock_items SET current_qty = current_qty + $1 WHERE id=$2 AND company_id=$3',
        [qtyDelta, item.stock_item_id, companyId]
      );
    }

    const balanceDelta = type === 'sales' ? totalAmount : -totalAmount;
    await client.query('UPDATE ledgers SET balance = balance + $1 WHERE id=$2', [balanceDelta, ledger_id]);
    await client.query('COMMIT');

    return res.status(201).json(voucher);
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: err.message || 'Server error' });
  } finally {
    client.release();
  }
};

const deleteVoucher = async (req, res) => {
  const { companyId, id } = req.params;
  if (!(await verifyCompany(companyId, req.user.id))) return res.status(403).json({ message: 'Access denied' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const vResult = await client.query('SELECT * FROM vouchers WHERE id=$1 AND company_id=$2', [id, companyId]);
    if (!vResult.rows.length) throw new Error('Voucher not found');
    const voucher = vResult.rows[0];
    const items = await client.query('SELECT * FROM voucher_items WHERE voucher_id=$1', [id]);
    for (const item of items.rows) {
      const qtyDelta = voucher.type === 'purchase' ? -item.quantity : item.quantity;
      await client.query('UPDATE stock_items SET current_qty = current_qty + $1 WHERE id=$2', [qtyDelta, item.stock_item_id]);
    }
    const balanceDelta = voucher.type === 'sales' ? -voucher.total_amount : voucher.total_amount;
    await client.query('UPDATE ledgers SET balance = balance + $1 WHERE id=$2', [balanceDelta, voucher.ledger_id]);
    await client.query('DELETE FROM vouchers WHERE id=$1', [id]);
    await client.query('COMMIT');
    return res.json({ message: 'Voucher deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: err.message || 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = { getVouchers, getVoucher, createVoucher, deleteVoucher };