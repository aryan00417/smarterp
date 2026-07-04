const pool = require('../db/pool');

const getCompanies = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM companies WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const createCompany = async (req, res) => {
  const { name, address, gstin, state, state_code, financial_year, contact } = req.body;
  if (!name) return res.status(400).json({ message: 'Company name is required' });
  try {
    const count = await pool.query('SELECT COUNT(*) FROM companies WHERE user_id = $1', [req.user.id]);
    if (parseInt(count.rows[0].count) >= 5)
      return res.status(400).json({ message: 'Maximum 5 companies allowed' });
    const result = await pool.query(
      `INSERT INTO companies (user_id, name, address, gstin, state, state_code, financial_year, contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, name.trim(), address, gstin, state, state_code, financial_year || '2024-25', contact]
    );
    const company = result.rows[0];
    await pool.query(
      `INSERT INTO units (company_id, symbol, name) VALUES
        ($1,'PCS','Pieces'),($1,'KG','Kilograms'),($1,'BOX','Box'),($1,'LTR','Litres')
       ON CONFLICT DO NOTHING`,
      [company.id]
    );
    return res.status(201).json(company);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Company name already exists' });
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateCompany = async (req, res) => {
  const { id } = req.params;
  const { name, address, gstin, state, state_code, financial_year, contact } = req.body;
  try {
    const result = await pool.query(
      `UPDATE companies SET name=$1,address=$2,gstin=$3,state=$4,state_code=$5,financial_year=$6,contact=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [name, address, gstin, state, state_code, financial_year, contact, id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Company not found' });
    return res.json(result.rows[0]);
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

const deleteCompany = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM companies WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Company not found' });
    return res.json({ message: 'Company deleted' });
  } catch (err) { return res.status(500).json({ message: 'Server error' }); }
};

module.exports = { getCompanies, createCompany, updateCompany, deleteCompany };