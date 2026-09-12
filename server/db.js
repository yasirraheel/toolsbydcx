require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT) || 3306,
};

const DB_NAME = process.env.DB_NAME || 'flowbydcx';

let pool;

async function initDB() {
  try {
    if (dbConfig.user !== 'root') {
      // Connect directly to existing user database
      pool = mysql.createPool({
        ...dbConfig,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    } else {
      const initConnection = await mysql.createConnection(dbConfig);
      await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
      await initConnection.end();

      pool = mysql.createPool({
        ...dbConfig,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    }

    // 1. Users table (Registration, Login, Email Verification)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT 0,
        verification_code VARCHAR(10),
        verification_expires_at BIGINT,
        reset_token VARCHAR(100),
        reset_expires_at BIGINT,
        role VARCHAR(30) DEFAULT 'user',
        plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query(`ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0 AFTER is_verified;`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN role VARCHAR(30) DEFAULT 'user' AFTER reset_expires_at;`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN reseller_id VARCHAR(100) NULL AFTER role;`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN max_customers INT DEFAULT 10 AFTER reseller_id;`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'free' AFTER reseller_id;`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN expires_at TIMESTAMP NULL AFTER plan;`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN credits INT DEFAULT 100 AFTER expires_at;`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE users ADD INDEX idx_reseller_id (reseller_id);`);
    } catch {}

    // Plans table for account sharing & access control
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        price DECIMAL(10, 2) DEFAULT 0,
        billing_cycle VARCHAR(50) DEFAULT 'monthly',
        duration_days INT DEFAULT 30,
        credits INT DEFAULT 100,
        description TEXT,
        features JSON,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query(`ALTER TABLE plans ADD COLUMN credits INT DEFAULT 100 AFTER duration_days;`);
    } catch {}

    // Seed default plans if empty
    try {
      const [existingPlans] = await pool.query('SELECT COUNT(*) as count FROM plans');
      if (existingPlans[0].count === 0) {
        await pool.query(`
          INSERT INTO plans (id, name, price, billing_cycle, duration_days, credits, description, features, is_active) VALUES
          ('plan_free', 'Free Pass', 0.00, 'lifetime', 3650, 25, 'Standard preview access to shared resources.', JSON_ARRAY('Standard shared account access', 'Community support'), 1),
          ('plan_pro', 'Pro Pass', 9.99, 'monthly', 30, 200, 'Full access to premium shared accounts with Chrome extension.', JSON_ARRAY('Instant 1-Click Access', 'Auto-refresh session tokens', 'Priority account access'), 1),
          ('plan_unlimited', 'Unlimited VIP Pass', 29.99, 'quarterly', 90, -1, 'All-inclusive VIP access for high-volume usage.', JSON_ARRAY('All Pro features', 'Multi-device extension support', 'Dedicated high-speed proxies'), 1);
        `);
      } else {
        // Ensure default plans have credits configured if they were 100 or null
        await pool.query("UPDATE plans SET credits = 25 WHERE id = 'plan_free' AND (credits IS NULL OR credits = 100)");
        await pool.query("UPDATE plans SET credits = 200 WHERE id = 'plan_pro' AND (credits IS NULL OR credits = 100)");
        await pool.query("UPDATE plans SET credits = -1 WHERE id = 'plan_unlimited' AND (credits IS NULL OR credits = 100)");
      }
    } catch (e) {
      console.warn('Plans seed warning:', e.message);
    }

    // Shared Accounts table for Chrome Extension Cookie Sharing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_accounts (
        id VARCHAR(100) PRIMARY KEY,
        service_name VARCHAR(150) NOT NULL,
        target_url VARCHAR(255) NOT NULL,
        description TEXT,
        cookies LONGTEXT NOT NULL,
        cookie_version INT DEFAULT 1,
        status VARCHAR(30) DEFAULT 'active',
        allowed_plans JSON,
        max_users INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Extension Sessions / Access Log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS extension_sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        account_id VARCHAR(100) NOT NULL,
        device_id VARCHAR(100),
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_account_id (account_id),
        UNIQUE KEY unique_user_device (user_id, device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // User Projects table for storing projects created by users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_projects (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        project_id VARCHAR(100) NOT NULL,
        project_url VARCHAR(255) NOT NULL,
        title VARCHAR(255) DEFAULT 'Flow Project',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_project_id (project_id),
        UNIQUE KEY unique_user_project (user_id, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Extension Releases table for Admin Extension Upload & Force Update Control
    await pool.query(`
      CREATE TABLE IF NOT EXISTS extension_releases (
        id VARCHAR(100) PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        min_version VARCHAR(50) DEFAULT '1.0.0',
        force_update BOOLEAN DEFAULT 0,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_size BIGINT DEFAULT 0,
        release_notes TEXT,
        download_url VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      const [existingReleases] = await pool.query('SELECT COUNT(*) as count FROM extension_releases');
      if (existingReleases[0].count === 0) {
        await pool.query(`
          INSERT INTO extension_releases (id, version, min_version, force_update, file_name, file_path, file_size, release_notes, download_url, is_active)
          VALUES ('ext_rel_initial', '1.0.0', '1.0.0', 0, 'toolsbydcx_extension_v1.0.0.zip', 'uploads/extension/toolsbydcx_extension_v1.0.0.zip', 0, 'Initial production release of ToolsByDcx Chrome Extension.', '/api/extension/download', 1);
        `);
      }
    } catch (e) {
      console.warn('Extension releases seed warning:', e.message);
    }

    // Seed default shared account if empty
    try {
      const [existingAccs] = await pool.query('SELECT COUNT(*) as count FROM shared_accounts');
      if (existingAccs[0].count === 0) {
        const sampleCookies = JSON.stringify([
          {
            name: "__Secure-next-auth.session-token",
            value: "flowbydcx_sample_session_token_replace_in_admin",
            domain: ".google.com",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "no_restriction"
          }
        ]);
        await pool.query(`
          INSERT INTO shared_accounts (id, service_name, target_url, description, cookies, cookie_version, status, allowed_plans, max_users)
          VALUES ('acc_google_flow_1', 'Google Flow Primary', 'https://labs.google/fx/tools/flow', 'Official Google Flow shared workspace account with active tier', ?, 1, 'active', JSON_ARRAY('plan_pro', 'plan_unlimited', 'pro', 'unlimited'), 50);
        `, [sampleCookies]);
        console.log('✅ Seeded default shared Google Flow account.');
      }
    } catch (e) {
      console.warn('Shared accounts seed warning:', e.message);
    }

    // Ensure default test accounts for all roles (Admin, Reseller, End User)
    try {
      const bcrypt = require('bcryptjs');
      const testPassword = 'Password123!';
      const passwordHash = await bcrypt.hash(testPassword, 10);

      // 1. Admin account
      const adminEmail = 'admin@flowbydcx.com';
      const [existingAdmin] = await pool.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
      if (existingAdmin.length === 0) {
        await pool.query(
          "INSERT INTO users (id, name, email, password_hash, role, plan, is_verified, created_at) VALUES (?, ?, ?, ?, 'admin', 'unlimited', 1, NOW())",
          ['usr_admin_flowbydcx', 'Admin FlowByDcx', adminEmail, passwordHash]
        );
        console.log(`✅ Default Admin Account Ready: ${adminEmail} (Password: ${testPassword})`);
      }

      // 2. Reseller account
      const resellerEmail = 'reseller@flowbydcx.com';
      const resellerId = 'usr_reseller_demo';
      const [existingReseller] = await pool.query('SELECT id FROM users WHERE email = ?', [resellerEmail]);
      if (existingReseller.length === 0) {
        await pool.query(
          "INSERT INTO users (id, name, email, password_hash, role, plan, is_verified, created_at) VALUES (?, ?, ?, ?, 'reseller', 'unlimited', 1, NOW())",
          [resellerId, 'Primary Partner Reseller', resellerEmail, passwordHash]
        );
        console.log(`✅ Default Reseller Account Ready: ${resellerEmail} (Password: ${testPassword})`);
      }

      // 3. End User account (managed by reseller, with 30-day expiration)
      const userEmail = 'user@flowbydcx.com';
      const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [userEmail]);
      if (existingUser.length === 0) {
        await pool.query(
          "INSERT INTO users (id, name, email, password_hash, role, reseller_id, plan, expires_at, is_verified, created_at) VALUES (?, ?, ?, ?, 'user', ?, 'plan_pro', DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW())",
          ['usr_customer_demo', 'Alex Johnson', userEmail, passwordHash, resellerId]
        );
        console.log(`✅ Default End User Ready: ${userEmail} (Password: ${testPassword})`);
      }
    } catch (e) {
      console.warn('Default accounts check:', e.message);
    }

    return pool;
  } catch (error) {
    console.error('Error initializing MySQL database:', error.message);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB() first.');
  }
  return pool;
}

module.exports = { initDB, getPool };
