const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { register, login, getMe } = require('../controllers/authController');
const { getCompanies, createCompany, updateCompany, deleteCompany } = require('../controllers/companyController');
const { getLedgers, getLedger, createLedger, updateLedger, deleteLedger, getLedgerGroups } = require('../controllers/ledgerController');
const { getStockItems, getStockItem, createStockItem, updateStockItem, deleteStockItem, getUnits } = require('../controllers/stockController');
const { getVouchers, getVoucher, createVoucher, deleteVoucher } = require('../controllers/voucherController');

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', protect, getMe);

router.get('/ledger-groups', protect, getLedgerGroups);

router.get('/companies', protect, getCompanies);
router.post('/companies', protect, createCompany);
router.put('/companies/:id', protect, updateCompany);
router.delete('/companies/:id', protect, deleteCompany);

router.get('/companies/:companyId/ledgers', protect, getLedgers);
router.post('/companies/:companyId/ledgers', protect, createLedger);
router.get('/companies/:companyId/ledgers/:id', protect, getLedger);
router.put('/companies/:companyId/ledgers/:id', protect, updateLedger);
router.delete('/companies/:companyId/ledgers/:id', protect, deleteLedger);

router.get('/companies/:companyId/units', protect, getUnits);

router.get('/companies/:companyId/stock-items', protect, getStockItems);
router.post('/companies/:companyId/stock-items', protect, createStockItem);
router.get('/companies/:companyId/stock-items/:id', protect, getStockItem);
router.put('/companies/:companyId/stock-items/:id', protect, updateStockItem);
router.delete('/companies/:companyId/stock-items/:id', protect, deleteStockItem);

router.get('/companies/:companyId/vouchers', protect, getVouchers);
router.post('/companies/:companyId/vouchers', protect, createVoucher);
router.get('/companies/:companyId/vouchers/:id', protect, getVoucher);
router.delete('/companies/:companyId/vouchers/:id', protect, deleteVoucher);

module.exports = router;