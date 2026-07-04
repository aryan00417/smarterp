CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  address         TEXT,
  gstin           VARCHAR(15),
  state           VARCHAR(50),
  state_code      VARCHAR(5),
  financial_year  VARCHAR(10) DEFAULT '2024-25',
  contact         VARCHAR(15),
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE ledger_groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  nature      VARCHAR(20) NOT NULL
);

INSERT INTO ledger_groups (name, nature) VALUES
  ('Sundry Debtors',    'Assets'),
  ('Sundry Creditors',  'Liabilities'),
  ('Bank Accounts',     'Assets'),
  ('Cash in Hand',      'Assets'),
  ('Sales Account',     'Income'),
  ('Purchase Account',  'Expenses'),
  ('Direct Expenses',   'Expenses'),
  ('Indirect Expenses', 'Expenses'),
  ('Stock in Hand',     'Assets');

CREATE TABLE ledgers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  group_id        INTEGER NOT NULL REFERENCES ledger_groups(id),
  type            VARCHAR(20) NOT NULL CHECK (type IN ('customer','supplier','bank','cash','expense','income')),
  phone           VARCHAR(15),
  address         TEXT,
  gstin           VARCHAR(15),
  opening_balance NUMERIC(15,2) DEFAULT 0,
  balance         NUMERIC(15,2) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE TABLE units (
  id          SERIAL PRIMARY KEY,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  symbol      VARCHAR(10) NOT NULL,
  name        VARCHAR(50) NOT NULL,
  UNIQUE(company_id, symbol)
);

CREATE TABLE stock_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  sku             VARCHAR(50),
  unit_id         INTEGER REFERENCES units(id),
  purchase_price  NUMERIC(15,2) DEFAULT 0,
  selling_price   NUMERIC(15,2) DEFAULT 0,
  gst_rate        NUMERIC(5,2) DEFAULT 0,
  opening_qty     NUMERIC(15,3) DEFAULT 0,
  current_qty     NUMERIC(15,3) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE TABLE vouchers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('sales','purchase')),
  voucher_no      VARCHAR(30) NOT NULL,
  date            DATE NOT NULL,
  ledger_id       UUID NOT NULL REFERENCES ledgers(id),
  narration       TEXT,
  subtotal        NUMERIC(15,2) DEFAULT 0,
  cgst_amount     NUMERIC(15,2) DEFAULT 0,
  sgst_amount     NUMERIC(15,2) DEFAULT 0,
  igst_amount     NUMERIC(15,2) DEFAULT 0,
  total_amount    NUMERIC(15,2) DEFAULT 0,
  is_igst         BOOLEAN DEFAULT FALSE,
  status          VARCHAR(20) DEFAULT 'posted',
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, voucher_no)
);

CREATE TABLE voucher_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id      UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  stock_item_id   UUID NOT NULL REFERENCES stock_items(id),
  quantity        NUMERIC(15,3) NOT NULL,
  rate            NUMERIC(15,2) NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  gst_rate        NUMERIC(5,2) DEFAULT 0,
  gst_amount      NUMERIC(15,2) DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL
);

CREATE INDEX idx_ledgers_company  ON ledgers(company_id);
CREATE INDEX idx_stock_company    ON stock_items(company_id);
CREATE INDEX idx_vouchers_company ON vouchers(company_id);
CREATE INDEX idx_vouchers_type    ON vouchers(type);
CREATE INDEX idx_vouchers_date    ON vouchers(date);
CREATE INDEX idx_voucher_items    ON voucher_items(voucher_id);