const pool = require('./db');

const createTables = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'procurement_officer', 'manager', 'vendor')),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS otp_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('register', 'change_password', 'reset_password')),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      otp_hash VARCHAR(255) NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS vendors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      company_name VARCHAR(255) NOT NULL,
      gst_number VARCHAR(100),
      contact_person VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      category VARCHAR(100),
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      rating DECIMAL(3,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS rfqs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      quantity INTEGER NOT NULL,
      unit VARCHAR(50),
      deadline DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'awarded', 'cancelled')),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS rfq_vendors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
      vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
      invited_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(rfq_id, vendor_id)
    )`,

    `CREATE TABLE IF NOT EXISTS rfq_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
      item_name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      unit VARCHAR(50),
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS quotations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rfq_id UUID REFERENCES rfqs(id) ON DELETE CASCADE,
      vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
      price DECIMAL(12,2) NOT NULL,
      delivery_days INTEGER NOT NULL,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected')),
      submitted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
      approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
      po_number VARCHAR(100) UNIQUE NOT NULL,
      vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
      rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
      total_amount DECIMAL(12,2),
      status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'acknowledged', 'fulfilled', 'cancelled')),
      notes TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      tax DECIMAL(12,2) DEFAULT 0,
      total DECIMAL(12,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
      due_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(255) NOT NULL,
      entity_type VARCHAR(100),
      entity_id UUID,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      type VARCHAR(100),
      entity_id UUID,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  ];

  try {
    for (const query of queries) {
      await pool.query(query);
    }
    console.log('All tables created successfully');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
};

module.exports = createTables;
