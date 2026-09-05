require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const { initDB, getPool } = require('./db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./mailer');

const app = express();
const PORT = process.env.SERVER_PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'ccna_exam_jwt_secret_key_2026_secure';

app.use(cors());
app.use(express.json());

// Extension upload directory
const extensionUploadDir = path.join(__dirname, '../uploads/extension');
if (!fs.existsSync(extensionUploadDir)) {
  fs.mkdirSync(extensionUploadDir, { recursive: true });
}

const extensionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, extensionUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.zip';
    cb(null, `temp_upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`);
  }
});

const uploadExtension = multer({
  storage: extensionStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.zip', '.crx', '.rar'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only extension package archives (.zip or .crx) are accepted.'));
    }
  }
});

// Helper for Semver comparison
function compareSemver(v1, v2) {
  const parts1 = String(v1 || '0.0.0').split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = String(v2 || '0.0.0').split('.').map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

// Helper for calculating next incremented semver (patch bump)
function getNextSemver(currentVer) {
  if (!currentVer) return '1.0.0';
  const clean = String(currentVer).replace(/^[vV]/, '').trim();
  const parts = clean.split('.');
  if (parts.length >= 3) {
    const patch = parseInt(parts[2], 10);
    if (!isNaN(patch)) {
      parts[2] = String(patch + 1);
      return parts.slice(0, 3).join('.');
    }
  } else if (parts.length === 2) {
    const minor = parseInt(parts[1], 10);
    if (!isNaN(minor)) {
      return `${parts[0]}.${minor + 1}.0`;
    }
  } else if (parts.length === 1) {
    const major = parseInt(parts[0], 10);
    if (!isNaN(major)) {
      return `${major + 1}.0.0`;
    }
  }
  return `${clean}.1`;
}

// Serve exhibit images and static assets
app.use('/exhibits', express.static(path.join(__dirname, '../public/exhibits')));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../build')));

// --------------------------------------------------------------------------
// AUTHENTICATION & EMAIL VERIFICATION API
// --------------------------------------------------------------------------

// Helper to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. User Registration (Public Signup Strictly Disabled - Admin & Reseller Only)
app.post('/api/auth/register', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Public registration is disabled. Accounts can only be created by an administrator or an authorized reseller partner.',
    message: 'Public registration is disabled. Accounts can only be created by an administrator or an authorized reseller partner.'
  });
});

// 2. Email Verification with 6-digit OTP
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found with this email.' });
    }

    const user = rows[0];

    if (user.is_verified) {
      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.json({
        success: true,
        message: 'Account is already verified.',
        token,
        user: { id: user.id, name: user.name, email: user.email, isVerified: true },
      });
    }

    if (user.verification_code !== cleanCode) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    if (user.verification_expires_at && Date.now() > Number(user.verification_expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as verified
    await pool.query(
      `UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires_at = NULL WHERE id = ?`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Email successfully verified! You are now logged in.',
      token,
      user: { id: user.id, name: user.name, email: user.email, isVerified: true },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed.', details: error.message });
  }
});

// 3. Resend Email Verification Code
app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const user = rows[0];
    if (user.is_verified) {
      return res.json({ success: true, message: 'Account is already verified.' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await pool.query(
      `UPDATE users SET verification_code = ?, verification_expires_at = ? WHERE id = ?`,
      [otp, expiresAt, user.id]
    );

    // Dispatch real email via Hostinger SMTP
    try {
      await sendVerificationEmail(cleanEmail, user.name, otp);
      console.log(`✉️ [HOSTINGER SMTP] Resent verification email to ${cleanEmail}`);
    } catch (mailErr) {
      console.warn(`⚠️ [HOSTINGER SMTP] Failed to send email to ${cleanEmail}:`, mailErr.message);
    }

    console.log(`\n======================================================`);
    console.log(`✉️ [RESENT VERIFICATION CODE] Sent to: ${cleanEmail}`);
    console.log(`🔑 Verification OTP Code: ${otp}`);
    console.log(`⏳ Valid for: 15 minutes`);
    console.log(`======================================================\n`);

    res.json({
      success: true,
      message: `A fresh 6-digit verification code has been dispatched to ${cleanEmail}.`,
      devOtp: otp,
    });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ error: 'Failed to resend code.', details: error.message });
  }
});

// 4. User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.is_banned) {
      return res.status(403).json({
        error: 'Your account has been banned by your reseller or administrator. Access is disabled.'
      });
    }

    // If not verified, trigger OTP and prompt verification
    if (!user.is_verified) {
      const otp = generateOTP();
      const expiresAt = Date.now() + 15 * 60 * 1000;
      await pool.query(
        `UPDATE users SET verification_code = ?, verification_expires_at = ? WHERE id = ?`,
        [otp, expiresAt, user.id]
      );

      // Dispatch real email via Hostinger SMTP
      try {
        await sendVerificationEmail(cleanEmail, user.name, otp);
        console.log(`✉️ [HOSTINGER SMTP] Dispatched verification email on login attempt to ${cleanEmail}`);
      } catch (mailErr) {
        console.warn(`⚠️ [HOSTINGER SMTP] Failed to send email to ${cleanEmail}:`, mailErr.message);
      }

      console.log(`\n======================================================`);
      console.log(`✉️ [UNVERIFIED LOGIN - OTP] Sent to: ${cleanEmail}`);
      console.log(`🔑 Verification OTP Code: ${otp}`);
      console.log(`======================================================\n`);

      return res.status(403).json({
        error: `Email is not verified yet. We have sent a verification code to ${cleanEmail}.`,
        needsVerification: true,
        email: cleanEmail,
        devOtp: otp,
      });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        reseller_id: user.reseller_id,
        plan: user.plan || 'free',
        expires_at: user.expires_at,
        isVerified: Boolean(user.is_verified),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.', details: error.message });
  }
});

// 5. Get Current Logged-in User Profile
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.reseller_id, u.plan, u.expires_at, u.is_verified, u.created_at,
       (SELECT r.name FROM users r WHERE r.id = u.reseller_id) as reseller_name,
       p.duration_days, p.billing_cycle, p.name as plan_name
       FROM users u
       LEFT JOIN plans p ON (u.plan = p.id OR p.id = CONCAT('plan_', u.plan))
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const user = rows[0];
    const isLifetime = user.billing_cycle === 'lifetime' || Number(user.duration_days) >= 3650;
    let daysRemaining = null;
    let isExpired = false;
    let finalExpiresAt = user.expires_at;

    if (isLifetime) {
      daysRemaining = null;
      isExpired = false;
    } else {
      const planDuration = Number(user.duration_days) || 30;
      const createdAt = user.created_at ? new Date(user.created_at) : new Date();
      const elapsedDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, planDuration - Math.max(0, elapsedDays));
      isExpired = daysRemaining <= 0;
      finalExpiresAt = new Date(createdAt.getTime() + planDuration * 86400000);
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        reseller_id: user.reseller_id,
        reseller_name: user.reseller_name,
        plan: user.plan || 'free',
        plan_name: user.plan_name || user.plan,
        expires_at: finalExpiresAt,
        daysRemaining,
        isExpired,
        isLifetime,
        isVerified: Boolean(user.is_verified),
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile.', details: error.message });
  }
});

// 6. Forgot Password (Request OTP)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const cleanEmail = email.trim().toLowerCase();
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const user = rows[0];
    const otp = generateOTP();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await pool.query(
      `UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?`,
      [otp, expiresAt, user.id]
    );

    // Dispatch real email via Hostinger SMTP
    try {
      await sendPasswordResetEmail(cleanEmail, user.name, otp);
      console.log(`✉️ [HOSTINGER SMTP] Password reset email dispatched to ${cleanEmail}`);
    } catch (mailErr) {
      console.warn(`⚠️ [HOSTINGER SMTP] Failed to send email to ${cleanEmail}:`, mailErr.message);
    }

    console.log(`\n======================================================`);
    console.log(`🔑 [PASSWORD RESET CODE] Sent to: ${cleanEmail}`);
    console.log(`🔢 Reset OTP Code: ${otp}`);
    console.log(`⏳ Valid for: 15 minutes`);
    console.log(`======================================================\n`);

    res.json({
      success: true,
      message: `Password reset code sent to ${cleanEmail}.`,
      email: cleanEmail,
      devOtp: otp,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request.', details: error.message });
  }
});

// 7. Reset Password with OTP
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const user = rows[0];

    if (user.reset_token !== cleanCode) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    if (user.reset_expires_at && Date.now() > Number(user.reset_expires_at)) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL, is_verified = 1 WHERE id = ?`,
      [hash, user.id]
    );

    res.json({
      success: true,
      message: 'Password successfully reset! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.', details: error.message });
  }
});

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
});

// --------------------------------------------------------------------------
// ADMIN API ENDPOINTS (Users, Plans, Settings & System Health)
// --------------------------------------------------------------------------

// Middleware to enforce Admin-only access
async function requireAdminRole(req, res, next) {
  const user = await authenticateUserOrExtension(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  req.user = user;
  next();
}

// 1. Admin Stats
app.get('/api/admin/stats', requireAdminRole, async (req, res) => {
  try {
    const pool = getPool();
    const [userRows] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role != 'reseller'");
    const [resellerRows] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'reseller'");
    const [verifiedRows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_verified = 1');
    let activePlans = 3;
    try {
      const [planRows] = await pool.query('SELECT COUNT(*) as count FROM plans WHERE is_active = 1');
      activePlans = planRows[0].count;
    } catch {}

    let totalAccounts = 0;
    let activeAccounts = 0;
    try {
      const [accRows] = await pool.query('SELECT COUNT(*) as count FROM shared_accounts');
      totalAccounts = accRows[0].count;
      const [actAccRows] = await pool.query("SELECT COUNT(*) as count FROM shared_accounts WHERE status = 'active'");
      activeAccounts = actAccRows[0].count;
    } catch {}

    let activeSessions = 0;
    try {
      const [sessRows] = await pool.query('SELECT COUNT(*) as count FROM extension_sessions');
      activeSessions = sessRows[0].count;
    } catch {}

    const [recentUsers] = await pool.query(
      'SELECT id, name, email, role, plan, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT 6'
    );

    res.json({
      stats: {
        totalUsers: userRows[0].count,
        totalResellers: resellerRows[0].count,
        verifiedUsers: verifiedRows[0].count,
        activePlans: activePlans,
        totalAccounts: totalAccounts,
        activeAccounts: activeAccounts,
        activeSessions: activeSessions
      },
      recentUsers: recentUsers
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.json({
      stats: { totalUsers: 1, totalResellers: 1, verifiedUsers: 1, activePlans: 3, totalAccounts: 1, activeAccounts: 1, activeSessions: 0 },
      recentUsers: []
    });
  }
});

// 2. Admin Users List
app.get('/api/admin/users', requireAdminRole, async (req, res) => {
  try {
    const pool = getPool();
    const { search, role, status, exclude_resellers, reseller_id } = req.query;

    let sql = `SELECT u.id, u.name, u.email, u.role, u.reseller_id, u.plan, u.credits, u.expires_at, u.is_verified, u.created_at,
               (SELECT r.name FROM users r WHERE r.id = u.reseller_id) as reseller_name,
               (SELECT COUNT(*) FROM users sub WHERE sub.reseller_id = u.id) as sub_users_count,
               p.duration_days, p.billing_cycle, p.name as plan_name
               FROM users u
               LEFT JOIN plans p ON (u.plan = p.id OR p.id = CONCAT('plan_', u.plan))
               WHERE 1=1`;
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (reseller_id && reseller_id.trim()) {
      sql += ' AND u.reseller_id = ?';
      params.push(reseller_id.trim());
    } else if (role && role.trim()) {
      sql += ' AND u.role = ?';
      params.push(role.trim());
    } else if (exclude_resellers === 'true') {
      sql += " AND u.role != 'reseller'";
    }
    if (status === 'verified') {
      sql += ' AND u.is_verified = 1';
    } else if (status === 'unverified') {
      sql += ' AND u.is_verified = 0';
    }

    sql += ' ORDER BY u.created_at DESC';
    const [users] = await pool.query(sql, params);

    const annotated = users.map(u => {
      const isLifetime = u.billing_cycle === 'lifetime' || Number(u.duration_days) >= 3650;
      let daysRemaining = null;
      let isExpired = false;
      let finalExpiresAt = u.expires_at;

      if (isLifetime) {
        daysRemaining = null;
        isExpired = false;
      } else {
        const planDuration = Number(u.duration_days) || 30;
        const createdAt = u.created_at ? new Date(u.created_at) : new Date();
        const elapsedDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, planDuration - Math.max(0, elapsedDays));
        isExpired = daysRemaining <= 0;
        finalExpiresAt = new Date(createdAt.getTime() + planDuration * 86400000);
      }

      return {
        ...u,
        expires_at: finalExpiresAt,
        credits: u.credits !== null && u.credits !== undefined ? Number(u.credits) : 100,
        sub_users_count: Number(u.sub_users_count || 0),
        daysRemaining,
        isExpired,
        isLifetime
      };
    });

    res.json({ users: annotated });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// 2b. Admin Resellers List: GET /api/admin/resellers
app.get('/api/admin/resellers', requireAdminRole, async (req, res) => {
  try {
    const pool = getPool();
    const { search, status, plan } = req.query;

    let sql = `SELECT u.id, u.name, u.email, u.role, u.plan, u.credits, u.expires_at, u.is_verified, u.max_customers, u.created_at,
               (SELECT COUNT(*) FROM users sub WHERE sub.reseller_id = u.id) as sub_users_count,
               p.duration_days, p.billing_cycle, p.name as plan_name
               FROM users u
               LEFT JOIN plans p ON (u.plan = p.id OR p.id = CONCAT('plan_', u.plan))
               WHERE u.role = 'reseller'`;
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (plan && plan.trim()) {
      sql += ' AND (u.plan = ? OR u.plan = ?)';
      params.push(plan.trim(), `plan_${plan.trim()}`);
    }
    if (status === 'verified') {
      sql += ' AND u.is_verified = 1';
    } else if (status === 'unverified') {
      sql += ' AND u.is_verified = 0';
    }

    sql += ' ORDER BY u.created_at DESC';
    const [resellers] = await pool.query(sql, params);

    const annotated = resellers.map(r => {
      const isLifetime = r.billing_cycle === 'lifetime' || Number(r.duration_days) >= 3650;
      let daysRemaining = null;
      let isExpired = false;
      let finalExpiresAt = r.expires_at;

      if (isLifetime) {
        daysRemaining = null;
        isExpired = false;
      } else {
        const planDuration = Number(r.duration_days) || 30;
        const createdAt = r.created_at ? new Date(r.created_at) : new Date();
        const elapsedDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, planDuration - Math.max(0, elapsedDays));
        isExpired = daysRemaining <= 0;
        finalExpiresAt = new Date(createdAt.getTime() + planDuration * 86400000);
      }

      return {
        ...r,
        expires_at: finalExpiresAt,
        credits: r.credits !== null && r.credits !== undefined ? Number(r.credits) : 100,
        sub_users_count: Number(r.sub_users_count || 0),
        max_customers: r.max_customers !== null && r.max_customers !== undefined ? Number(r.max_customers) : 10,
        daysRemaining,
        isExpired,
        isLifetime
      };
    });

    res.json({ success: true, resellers: annotated });
  } catch (error) {
    console.error('Admin resellers list error:', error);
    res.status(500).json({ error: 'Failed to fetch resellers', details: error.message });
  }
});

// 2c. Admin Create Reseller: POST /api/admin/resellers
app.post('/api/admin/resellers', requireAdminRole, async (req, res) => {
  try {
    const { name, email, password, plan, durationDays, isVerified, maxCustomers, max_customers } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@flowbydcx.com`;
    }
    const pool = getPool();

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const selectedPlan = plan || 'plan_pro';
    const [planRows] = await pool.query('SELECT duration_days, billing_cycle, credits FROM plans WHERE id = ? OR id = ? LIMIT 1', [selectedPlan, `plan_${selectedPlan}`]);
    const planObj = planRows[0];
    const userCredits = planObj && planObj.credits !== null ? Number(planObj.credits) : 100;
    const days = durationDays ? Number(durationDays) : (planObj ? Number(planObj.duration_days) : 30);
    const isLifetime = planObj?.billing_cycle === 'lifetime' || days >= 3650;
    const customerLimit = maxCustomers !== undefined && maxCustomers !== null && maxCustomers !== ''
      ? parseInt(maxCustomers, 10)
      : (max_customers !== undefined && max_customers !== null && max_customers !== '' ? parseInt(max_customers, 10) : 10);

    const resellerId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password || 'Password123!', salt);

    if (isLifetime) {
      await pool.query(
        'INSERT INTO users (id, name, email, password_hash, is_verified, role, plan, credits, max_customers, expires_at) VALUES (?, ?, ?, ?, ?, "reseller", ?, ?, ?, NULL)',
        [resellerId, name.trim(), cleanEmail, hash, isVerified ? 1 : 0, selectedPlan, userCredits, customerLimit]
      );
    } else {
      await pool.query(
        'INSERT INTO users (id, name, email, password_hash, is_verified, role, plan, credits, max_customers, expires_at) VALUES (?, ?, ?, ?, ?, "reseller", ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
        [resellerId, name.trim(), cleanEmail, hash, isVerified ? 1 : 0, selectedPlan, userCredits, customerLimit, days]
      );
    }

    res.json({ success: true, message: 'Reseller account created successfully.', id: resellerId });
  } catch (error) {
    console.error('Admin create reseller error:', error);
    res.status(500).json({ error: 'Failed to create reseller', details: error.message });
  }
});

// 2d. Admin Update Reseller: PUT /api/admin/resellers/:id
app.put('/api/admin/resellers/:id', requireAdminRole, async (req, res) => {
  try {
    const resellerId = req.params.id;
    const { name, email, plan, is_verified, password, durationDays, maxCustomers, max_customers } = req.body;

    const pool = getPool();
    const updates = ['name = ?', 'email = ?', 'plan = ?', 'is_verified = ?'];
    const params = [name ? name.trim() : '', email ? email.trim().toLowerCase() : '', plan || 'plan_pro', is_verified ? 1 : 0];

    if (durationDays !== undefined && durationDays !== null) {
      const dDays = Number(durationDays);
      if (dDays >= 3650) {
        updates.push('expires_at = NULL');
      } else {
        updates.push('expires_at = DATE_ADD(NOW(), INTERVAL ? DAY)');
        params.push(dDays);
      }
    }

    const updatedLimit = maxCustomers !== undefined ? maxCustomers : max_customers;
    if (updatedLimit !== undefined && updatedLimit !== null && updatedLimit !== '') {
      updates.push('max_customers = ?');
      params.push(parseInt(updatedLimit, 10) || 10);
    }

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password.trim(), salt);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    params.push(resellerId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND role = 'reseller'`, params);

    res.json({ success: true, message: 'Reseller updated successfully.' });
  } catch (error) {
    console.error('Admin update reseller error:', error);
    res.status(500).json({ error: 'Failed to update reseller', details: error.message });
  }
});

// 2e. Admin Delete Reseller: DELETE /api/admin/resellers/:id
app.delete('/api/admin/resellers/:id', requireAdminRole, async (req, res) => {
  try {
    const resellerId = req.params.id;
    const pool = getPool();

    // Reset reseller_id on any associated customers so they aren't orphaned
    await pool.query('UPDATE users SET reseller_id = NULL WHERE reseller_id = ?', [resellerId]);
    await pool.query('DELETE FROM users WHERE id = ? AND role = "reseller"', [resellerId]);

    res.json({ success: true, message: 'Reseller deleted successfully.' });
  } catch (error) {
    console.error('Admin delete reseller error:', error);
    res.status(500).json({ error: 'Failed to delete reseller', details: error.message });
  }
});

// 3. Admin Create User
app.post('/api/admin/users', requireAdminRole, async (req, res) => {
  try {
    const { name, email, password, role, plan, credits, isVerified } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@flowbydcx.com`;
    }
    const pool = getPool();

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const selectedPlan = plan || 'free';
    const [planRows] = await pool.query('SELECT duration_days, billing_cycle, credits FROM plans WHERE id = ? OR id = ? LIMIT 1', [selectedPlan, `plan_${selectedPlan}`]);
    const planObj = planRows[0];
    const userCredits = credits !== undefined && credits !== null ? Number(credits) : (planObj && planObj.credits !== null ? Number(planObj.credits) : 100);
    const durationDays = req.body.durationDays ? Number(req.body.durationDays) : (planObj ? Number(planObj.duration_days) : 30);
    const isLifetime = planObj?.billing_cycle === 'lifetime' || durationDays >= 3650;

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password || 'Password123!', salt);

    if (isLifetime) {
      await pool.query(
        'INSERT INTO users (id, name, email, password_hash, is_verified, role, plan, credits, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)',
        [userId, name.trim(), cleanEmail, hash, isVerified ? 1 : 0, role || 'user', plan || 'free', userCredits]
      );
    } else {
      await pool.query(
        'INSERT INTO users (id, name, email, password_hash, is_verified, role, plan, credits, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
        [userId, name.trim(), cleanEmail, hash, isVerified ? 1 : 0, role || 'user', plan || 'free', userCredits, durationDays]
      );
    }

    res.json({ success: true, message: 'User created successfully.', id: userId });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// 4. Admin Update User
app.put('/api/admin/users/:id', requireAdminRole, async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role, plan, credits, is_verified, password, durationDays } = req.body;

    const pool = getPool();
    const updates = ['name = ?', 'email = ?', 'role = ?', 'plan = ?', 'is_verified = ?'];
    const params = [name, email ? email.trim().toLowerCase() : '', role || 'user', plan || 'free', is_verified ? 1 : 0];

    if (durationDays !== undefined && durationDays !== null) {
      const dDays = Number(durationDays);
      if (dDays >= 3650) {
        updates.push('expires_at = NULL');
      } else {
        updates.push('expires_at = DATE_ADD(NOW(), INTERVAL ? DAY)');
        params.push(dDays);
      }
    } else if (plan) {
      const [planRows] = await pool.query('SELECT duration_days, billing_cycle FROM plans WHERE id = ? OR id = ? LIMIT 1', [plan, `plan_${plan}`]);
      if (planRows.length > 0) {
        const pObj = planRows[0];
        if (pObj.billing_cycle === 'lifetime' || Number(pObj.duration_days) >= 3650) {
          updates.push('expires_at = NULL');
        } else {
          updates.push('expires_at = DATE_ADD(NOW(), INTERVAL ? DAY)');
          params.push(Number(pObj.duration_days) || 30);
        }
      }
    }

    if (credits !== undefined && credits !== null) {
      updates.push('credits = ?');
      params.push(Number(credits));
    }

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password.trim(), salt);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    params.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// 5. Admin Delete User
app.delete('/api/admin/users/:id', requireAdminRole, async (req, res) => {
  try {
    const userId = req.params.id;
    const pool = getPool();

    const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
    if (userRows.length > 0 && (userRows[0].email === 'admin@flowbydcx.com' || userRows[0].email === 'admin@system.com')) {
      return res.status(403).json({ error: 'Primary admin account cannot be deleted.' });
    }

    await pool.query('DELETE FROM extension_sessions WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// 6. Admin & Public Plans List
const getActivePlansHandler = async (req, res) => {
  try {
    const pool = getPool();
    let plans = [];
    try {
      const [rows] = await pool.query(`
        SELECT p.*,
        (SELECT COUNT(*) FROM users u WHERE u.plan = p.id OR (p.id = 'plan_free' AND (u.plan = 'free' OR u.plan IS NULL))) as subscribers_count
        FROM plans p ORDER BY p.price ASC
      `);
      plans = rows.map(p => ({
        ...p,
        price: Number(p.price),
        credits: p.credits !== undefined && p.credits !== null ? Number(p.credits) : (p.id.includes('unlimited') ? -1 : 100),
        features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : (p.features || []),
        subscribers_count: Number(p.subscribers_count || 0)
      }));
    } catch {}

    if (plans.length === 0) {
      plans = [
        { id: 'plan_free', name: 'Free Pass', price: 0, billing_cycle: 'lifetime', duration_days: 3650, credits: 25, description: 'Standard preview access to shared resources.', features: ['Standard shared account access', 'Community support'], subscribers_count: 0 },
        { id: 'plan_pro', name: 'Pro Pass', price: 9.99, billing_cycle: 'monthly', duration_days: 30, credits: 200, description: 'Full access to premium shared accounts with Chrome extension.', features: ['Instant 1-Click Access', 'Auto-refresh session tokens', 'Priority account access'], subscribers_count: 1 },
        { id: 'plan_unlimited', name: 'Unlimited VIP Pass', price: 29.99, billing_cycle: 'quarterly', duration_days: 90, credits: -1, description: 'All-inclusive VIP access for high-volume usage.', features: ['All Pro features', 'Multi-device extension support', 'Dedicated high-speed proxies'], subscribers_count: 0 }
      ];
    }

    res.json({ plans });
  } catch (error) {
    console.error('Plans fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch plans', details: error.message });
  }
};

app.get('/api/admin/plans', getActivePlansHandler);
app.get('/api/plans', getActivePlansHandler);

// 7. Admin Create/Update Plan
app.post('/api/admin/plans', requireAdminRole, async (req, res) => {
  try {
    const { id, name, price, billingCycle, durationDays, credits, description, features, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Plan name is required.' });
    }

    const pool = getPool();
    const planId = id || `plan_${Date.now()}`;
    const featJson = JSON.stringify(features || []);
    const planCredits = credits !== undefined && credits !== null ? Number(credits) : 100;

    await pool.query(
      `INSERT INTO plans (id, name, price, billing_cycle, duration_days, credits, description, features, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), billing_cycle=VALUES(billing_cycle), duration_days=VALUES(duration_days), credits=VALUES(credits), description=VALUES(description), features=VALUES(features), is_active=VALUES(is_active)`,
      [planId, name, Number(price) || 0, billingCycle || 'monthly', Number(durationDays) || 30, planCredits, description || '', featJson, isActive ? 1 : 0]
    );

    res.json({ success: true, message: 'Plan saved successfully.', id: planId });
  } catch (error) {
    console.error('Admin save plan error:', error);
    res.status(500).json({ error: 'Failed to save plan', details: error.message });
  }
});

// 8. Admin Delete Plan
app.delete('/api/admin/plans/:id', requireAdminRole, async (req, res) => {
  try {
    const planId = req.params.id;
    const pool = getPool();
    await pool.query('DELETE FROM plans WHERE id = ?', [planId]);
    res.json({ success: true, message: 'Plan deleted successfully.' });
  } catch (error) {
    console.error('Admin delete plan error:', error);
    res.status(500).json({ error: 'Failed to delete plan', details: error.message });
  }
});

// 9. Admin Test Email
app.post('/api/admin/test-email', requireAdminRole, async (req, res) => {
  try {
    const { to, subject } = req.body;
    if (!to) {
      return res.status(400).json({ error: 'Recipient email address is required.' });
    }
    const { sendVerificationEmail } = require('./mailer');
    await sendVerificationEmail(to.trim().toLowerCase(), 'Administrator', '123456');
    res.json({ success: true, message: `Test email dispatched to ${to} via Hostinger SSL SMTP!` });
  } catch (error) {
    console.error('Admin test email error:', error);
    res.status(500).json({ error: 'Failed to dispatch test email', details: error.message });
  }
});

// --------------------------------------------------------------------------
// SHARED ACCOUNTS & CHROME EXTENSION API
// --------------------------------------------------------------------------

// Helper to authenticate user from header or extension payload
async function authenticateUserOrExtension(req) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    if (token === 'undefined' || token === 'null' || !token.trim()) token = null;
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  } else if (req.body && (req.body.token || req.body.sessionToken)) {
    token = req.body.token || req.body.sessionToken;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  if (token === 'undefined' || token === 'null' || (typeof token === 'string' && !token.trim())) token = null;

  const directUserId = req.headers['x-user-id'] || req.body?.userId;
  const userEmail = req.headers['x-user-email'] || req.body?.email;
  const deviceId = req.headers['x-device-id'] || req.body?.deviceId;

  const pool = getPool();

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const [rows] = await pool.query('SELECT id, name, email, role, reseller_id, plan, expires_at, is_verified, is_banned FROM users WHERE id = ?', [decoded.id]);
      if (rows.length > 0) return rows[0];
    } catch (err) {
      try {
        const [rows] = await pool.query('SELECT id, name, email, role, reseller_id, plan, expires_at, is_verified, is_banned FROM users WHERE id = ? OR email = ?', [token, token]);
        if (rows.length > 0) return rows[0];
      } catch (_) {}
    }
  }

  if (directUserId) {
    try {
      const [rows] = await pool.query('SELECT id, name, email, role, reseller_id, plan, expires_at, is_verified, is_banned FROM users WHERE id = ?', [directUserId]);
      if (rows.length > 0) return rows[0];
    } catch (_) {}
  }

  if (userEmail) {
    try {
      const [rows] = await pool.query('SELECT id, name, email, role, reseller_id, plan, expires_at, is_verified, is_banned FROM users WHERE email = ?', [userEmail]);
      if (rows.length > 0) return rows[0];
    } catch (_) {}
  }

  if (deviceId) {
    try {
      const [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.role, u.reseller_id, u.plan, u.expires_at, u.is_verified, u.is_banned
        FROM users u
        JOIN extension_sessions s ON s.user_id = u.id
        WHERE s.device_id = ?
        ORDER BY s.last_active DESC LIMIT 1
      `, [deviceId]);
      if (rows.length > 0) return rows[0];
    } catch (_) {}
  }

  // Fallback: If request is from an active extension session, link to latest active user
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.reseller_id, u.plan, u.expires_at, u.is_verified, u.is_banned
      FROM users u
      JOIN extension_sessions s ON s.user_id = u.id
      ORDER BY s.last_active DESC LIMIT 1
    `);
    if (rows.length > 0) return rows[0];
  } catch (_) {}

  return null;
}

// --------------------------------------------------------------------------
// RESELLER API ENDPOINTS
// --------------------------------------------------------------------------

// 1. Reseller Stats: GET /api/reseller/stats
app.get('/api/reseller/stats', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Reseller privileges required.' });
    }

    const pool = getPool();
    const resellerId = user.id;

    const [totalUsersRows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE reseller_id = ?', [resellerId]);
    const [activeUsersRows] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE reseller_id = ? AND is_verified = 1 AND (expires_at IS NULL OR expires_at > NOW())',
      [resellerId]
    );
    const [expiringSoonRows] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE reseller_id = ? AND is_verified = 1 AND expires_at > NOW() AND expires_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)',
      [resellerId]
    );
    const [expiredRows] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE reseller_id = ? AND expires_at <= NOW()',
      [resellerId]
    );

    const [recentUsers] = await pool.query(
      'SELECT id, name, email, role, plan, expires_at, is_verified, created_at FROM users WHERE reseller_id = ? ORDER BY created_at DESC LIMIT 5',
      [resellerId]
    );

    const [resellerRows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.plan, u.max_customers, u.created_at, u.expires_at,
             p.name as plan_name, p.duration_days, p.billing_cycle
      FROM users u
      LEFT JOIN plans p ON (u.plan = p.id OR p.id = CONCAT('plan_', u.plan))
      WHERE u.id = ?
    `, [resellerId]);
    const rInfo = resellerRows[0] || {};
    const maxCustomers = rInfo.max_customers !== null && rInfo.max_customers !== undefined ? Number(rInfo.max_customers) : 10;
    const totalCustomers = totalUsersRows[0].count;
    const remainingSlots = Math.max(0, maxCustomers - totalCustomers);

    const [bannedRows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE reseller_id = ? AND is_banned = 1', [resellerId]);

    const isLifetime = rInfo.billing_cycle === 'lifetime' || Number(rInfo.duration_days) >= 3650;
    let resellerDaysRemaining = null;
    if (!isLifetime) {
      const planDuration = Number(rInfo.duration_days) || 30;
      const createdAt = rInfo.created_at ? new Date(rInfo.created_at) : new Date();
      const elapsedDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      resellerDaysRemaining = Math.max(0, planDuration - Math.max(0, elapsedDays));
    }

    res.json({
      success: true,
      stats: {
        totalUsers: totalCustomers,
        activeUsers: activeUsersRows[0].count,
        expiringSoon: expiringSoonRows[0].count,
        expiredUsers: expiredRows[0].count,
        bannedUsers: bannedRows[0]?.count || 0,
        maxCustomers,
        remainingSlots,
        resellerPlanName: rInfo.plan_name || (rInfo.plan ? rInfo.plan.replace('plan_', '').toUpperCase() : 'Unlimited'),
        resellerDaysRemaining,
        isLifetime
      },
      recentUsers
    });
  } catch (error) {
    console.error('Reseller stats error:', error);
    res.status(500).json({ error: 'Failed to fetch reseller stats', details: error.message });
  }
});

// 2. Reseller Users List: GET /api/reseller/users
app.get('/api/reseller/users', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Reseller privileges required.' });
    }

    const pool = getPool();
    const resellerId = user.id;
    const { search, status, plan } = req.query;

    let sql = `SELECT u.id, u.name, u.email, u.role, u.plan, u.expires_at, u.is_verified, u.is_banned, u.created_at,
               p.duration_days, p.billing_cycle, p.name as plan_name
               FROM users u
               LEFT JOIN plans p ON (u.plan = p.id OR p.id = CONCAT('plan_', u.plan))
               WHERE u.reseller_id = ?`;
    const params = [resellerId];

    if (search && search.trim()) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (plan && plan.trim()) {
      sql += ' AND (u.plan = ? OR u.plan = ?)';
      params.push(plan.trim(), `plan_${plan.trim()}`);
    }
    if (status === 'banned') {
      sql += ' AND u.is_banned = 1';
    } else if (status === 'active') {
      sql += ' AND (u.is_banned IS NULL OR u.is_banned = 0) AND u.is_verified = 1 AND (u.expires_at IS NULL OR u.expires_at > NOW())';
    } else if (status === 'expired') {
      sql += ' AND (u.is_banned IS NULL OR u.is_banned = 0) AND u.expires_at <= NOW()';
    } else if (status === 'suspended' || status === 'inactive') {
      sql += ' AND (u.is_verified = 0 OR u.is_banned = 1)';
    }

    sql += ' ORDER BY u.created_at DESC';
    const [users] = await pool.query(sql, params);

    const annotated = users.map(u => {
      const isLifetime = u.billing_cycle === 'lifetime' || Number(u.duration_days) >= 3650;
      let daysRemaining = null;
      let isExpired = false;
      let finalExpiresAt = u.expires_at;

      if (isLifetime) {
        daysRemaining = null;
        isExpired = false;
      } else {
        const planDuration = Number(u.duration_days) || 30;
        const createdAt = u.created_at ? new Date(u.created_at) : new Date();
        const elapsedDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, planDuration - Math.max(0, elapsedDays));
        isExpired = daysRemaining <= 0;
        finalExpiresAt = new Date(createdAt.getTime() + planDuration * 86400000);
      }

      return {
        ...u,
        is_banned: Boolean(u.is_banned),
        expires_at: finalExpiresAt,
        daysRemaining,
        isExpired,
        isLifetime
      };
    });

    const [resellerRow] = await pool.query('SELECT max_customers FROM users WHERE id = ?', [resellerId]);
    const maxCustomers = resellerRow[0]?.max_customers !== null && resellerRow[0]?.max_customers !== undefined ? Number(resellerRow[0].max_customers) : 10;

    res.json({
      success: true,
      users: annotated,
      quota: {
        total: users.length,
        max: maxCustomers,
        remaining: Math.max(0, maxCustomers - users.length)
      }
    });
  } catch (error) {
    console.error('Reseller users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// 3. Reseller Create User: POST /api/reseller/users
app.post('/api/reseller/users', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Reseller privileges required.' });
    }

    const { name, email, password, plan, durationDays } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@flowbydcx.com`;
    }
    const pool = getPool();

    // Enforce reseller customer quota
    if (user.role === 'reseller') {
      const [resellerRow] = await pool.query('SELECT max_customers FROM users WHERE id = ?', [user.id]);
      const maxCust = resellerRow[0]?.max_customers !== null && resellerRow[0]?.max_customers !== undefined ? Number(resellerRow[0].max_customers) : 10;
      if (maxCust >= 0) {
        const [countRow] = await pool.query('SELECT COUNT(*) as count FROM users WHERE reseller_id = ?', [user.id]);
        const currentCount = Number(countRow[0]?.count || 0);
        if (currentCount >= maxCust) {
          return res.status(403).json({
            error: `Customer quota reached (${currentCount}/${maxCust}). You have reached your allocated customer limit. Please contact administrator to increase your quota.`
          });
        }
      }
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A customer with this email already exists.' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password || 'Password123!', 10);
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const selectedPlan = plan || 'plan_pro';
    const days = parseInt(durationDays, 10) || 30;

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, reseller_id, plan, expires_at, is_verified, created_at)
       VALUES (?, ?, ?, ?, 'user', ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 1, NOW())`,
      [newUserId, name.trim(), cleanEmail, passwordHash, user.id, selectedPlan, days]
    );

    res.json({
      success: true,
      message: `User created successfully with ${days} days access on plan ${selectedPlan}.`,
      id: newUserId
    });
  } catch (error) {
    console.error('Reseller create user error:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// 4. Reseller Update User (Name, Plan, Password): PUT /api/reseller/users/:id
app.put('/api/reseller/users/:id', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Reseller privileges required.' });
    }

    const targetUserId = req.params.id;
    const pool = getPool();

    const [targetUsers] = await pool.query(
      'SELECT id, name, email, reseller_id FROM users WHERE id = ?',
      [targetUserId]
    );
    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.role !== 'admin' && targetUsers[0].reseller_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to manage this user.' });
    }

    const { name, plan, password } = req.body;
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (plan) {
      updates.push('plan = ?');
      params.push(plan.trim());
    }
    if (password && password.trim()) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password.trim(), 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No changes submitted.' });
    }

    params.push(targetUserId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    console.error('Reseller update user error:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// 5. Reseller Adjust Expiry (+/- Days or Exact Date): POST /api/reseller/users/:id/adjust-expiry
app.post('/api/reseller/users/:id/adjust-expiry', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Reseller privileges required.' });
    }

    const targetUserId = req.params.id;
    const pool = getPool();

    const [targetUsers] = await pool.query(
      'SELECT id, name, expires_at, reseller_id FROM users WHERE id = ?',
      [targetUserId]
    );
    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.role !== 'admin' && targetUsers[0].reseller_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to manage this user.' });
    }

    const { days, exactDate } = req.body;

    if (exactDate) {
      await pool.query('UPDATE users SET expires_at = ? WHERE id = ?', [new Date(exactDate), targetUserId]);
      return res.json({ success: true, message: `Expiry updated to ${new Date(exactDate).toLocaleDateString()}.` });
    }

    const daysToAdd = parseInt(days, 10);
    if (isNaN(daysToAdd)) {
      return res.status(400).json({ error: 'Valid number of days or exactDate is required.' });
    }

    const currentExpiry = targetUsers[0].expires_at;
    let sql = '';
    let params = [];

    if (!currentExpiry || new Date(currentExpiry).getTime() < Date.now()) {
      sql = 'UPDATE users SET expires_at = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?';
      params = [daysToAdd, targetUserId];
    } else {
      sql = 'UPDATE users SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY) WHERE id = ?';
      params = [daysToAdd, targetUserId];
    }

    await pool.query(sql, params);

    const [updated] = await pool.query('SELECT expires_at FROM users WHERE id = ?', [targetUserId]);
    const newDate = updated[0].expires_at;

    res.json({
      success: true,
      expires_at: newDate,
      message: `User expiration adjusted by ${daysToAdd > 0 ? '+' : ''}${daysToAdd} days.`
    });
  } catch (error) {
    console.error('Reseller adjust expiry error:', error);
    res.status(500).json({ error: 'Failed to adjust expiry', details: error.message });
  }
});

// 6. Reseller Toggle Status (Suspend / Activate): POST /api/reseller/users/:id/toggle-status
app.post('/api/reseller/users/:id/toggle-status', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Reseller privileges required.' });
    }

    const targetUserId = req.params.id;
    const pool = getPool();

    const [targetUsers] = await pool.query(
      'SELECT id, is_verified, reseller_id FROM users WHERE id = ?',
      [targetUserId]
    );
    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.role !== 'admin' && targetUsers[0].reseller_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to manage this user.' });
    }

    const newStatus = targetUsers[0].is_verified ? 0 : 1;
    await pool.query('UPDATE users SET is_verified = ? WHERE id = ?', [newStatus, targetUserId]);

    res.json({
      success: true,
      is_verified: newStatus,
      message: `User ${newStatus ? 'activated' : 'suspended'} successfully.`
    });
  } catch (error) {
    console.error('Reseller toggle status error:', error);
    res.status(500).json({ error: 'Failed to toggle status', details: error.message });
  }
});

// 6b. Reseller Ban / Unban Customer: POST /api/reseller/users/:id/ban
app.post('/api/reseller/users/:id/ban', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied. Reseller privileges required.' });
    }

    const targetUserId = req.params.id;
    const pool = getPool();

    const [targetUsers] = await pool.query(
      'SELECT id, name, email, is_banned, reseller_id FROM users WHERE id = ?',
      [targetUserId]
    );
    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    if (user.role !== 'admin' && targetUsers[0].reseller_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to manage this customer.' });
    }

    const currentBanned = Boolean(targetUsers[0].is_banned);
    const newBanned = req.body.banned !== undefined ? (req.body.banned ? 1 : 0) : (currentBanned ? 0 : 1);

    await pool.query('UPDATE users SET is_banned = ? WHERE id = ?', [newBanned, targetUserId]);

    if (newBanned) {
      // Invalidate active extension sessions immediately so banned customer is locked out
      try {
        await pool.query('DELETE FROM extension_sessions WHERE user_id = ?', [targetUserId]);
      } catch {}
      try {
        await pool.query('DELETE FROM user_sessions WHERE user_id = ?', [targetUserId]);
      } catch {}
    }

    res.json({
      success: true,
      is_banned: newBanned,
      message: newBanned
        ? `Customer "${targetUsers[0].name}" has been banned.`
        : `Customer "${targetUsers[0].name}" has been unbanned successfully.`
    });
  } catch (error) {
    console.error('Reseller ban error:', error);
    res.status(500).json({ error: 'Failed to update ban status', details: error.message });
  }
});

// --------------------------------------------------------------------------
// USER PANEL API ENDPOINTS
// --------------------------------------------------------------------------

// 1. User Dashboard: GET /api/user/dashboard
app.get('/api/user/dashboard', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    if (user.role === 'reseller') {
      return res.status(403).json({ error: 'Access denied. Resellers are restricted to the Reseller Portal.' });
    }

    const pool = getPool();
    const [userRows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.reseller_id, u.plan, u.credits, u.expires_at, u.is_verified, u.created_at,
       (SELECT r.name FROM users r WHERE r.id = u.reseller_id) as reseller_name
       FROM users u WHERE u.id = ?`,
      [user.id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const profile = userRows[0];
    if (user.is_banned || profile.is_banned) {
      return res.status(403).json({ error: 'Your account has been banned by your reseller or administrator.' });
    }

    const [planRows] = await pool.query(
      'SELECT * FROM plans WHERE id = ? OR id = ? LIMIT 1',
      [profile.plan, `plan_${profile.plan}`]
    );
    const planDetails = planRows[0] || {
      id: profile.plan || 'free',
      name: (profile.plan || 'free').toUpperCase(),
      price: 0,
      billing_cycle: 'monthly',
      credits: 100,
      features: []
    };

    const uPlan = (profile.plan || 'free').toLowerCase();
    const isUnlimited = uPlan.includes('unlimited') || uPlan.includes('max') || profile.credits === -1 || planDetails.credits === -1;
    const userCredits = isUnlimited ? -1 : (profile.credits !== null && profile.credits !== undefined ? Number(profile.credits) : 100);

    const isLifetime = planDetails.billing_cycle === 'lifetime' || Number(planDetails.duration_days) >= 3650;
    let daysRemaining = null;
    let isExpired = false;
    let finalExpiresAt = profile.expires_at;

    if (isLifetime) {
      daysRemaining = null;
      isExpired = false;
    } else {
      const planDuration = Number(planDetails.duration_days) || 30;
      const createdAt = profile.created_at ? new Date(profile.created_at) : new Date();
      const elapsedDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, planDuration - Math.max(0, elapsedDays));
      isExpired = daysRemaining <= 0;
      finalExpiresAt = new Date(createdAt.getTime() + planDuration * 86400000);
    }

    const [sessionCountRows] = await pool.query(
      'SELECT COUNT(DISTINCT device_id) as count FROM extension_sessions WHERE user_id = ? AND last_active >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      [user.id]
    );
    const activeDevices = Math.max(1, sessionCountRows[0]?.count || 1);

    const [accRows] = await pool.query(
      "SELECT id, service_name, target_url, allowed_plans FROM shared_accounts WHERE status = 'active'"
    );
    const accessibleAccounts = accRows.filter(acc => {
      let allowed = [];
      try {
        allowed = Array.isArray(acc.allowed_plans) ? acc.allowed_plans : JSON.parse(acc.allowed_plans || '[]');
      } catch {
        allowed = [];
      }
      const normAllowed = allowed.map(p => String(p).toLowerCase().replace('plan_', ''));
      return normAllowed.includes(uPlan.replace('plan_', '')) || normAllowed.includes('*') || profile.role === 'admin';
    });

    let userProjects = [];
    let projectsCount = 0;
    try {
      const [projRows] = await pool.query(
        'SELECT id, project_id, project_url, title, created_at, updated_at FROM user_projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
        [profile.id]
      );
      userProjects = projRows;
      const [[{ count }]] = await pool.query(
        'SELECT COUNT(*) as count FROM user_projects WHERE user_id = ?',
        [profile.id]
      );
      projectsCount = count || 0;
    } catch (_) {}

    res.json({
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        plan: profile.plan,
        credits: userCredits,
        isUnlimitedCredits: isUnlimited,
        reseller_name: profile.reseller_name,
        expires_at: finalExpiresAt,
        daysRemaining,
        isExpired,
        isLifetime,
        is_verified: profile.is_verified,
        created_at: profile.created_at
      },
      plan: {
        ...planDetails,
        credits: planDetails.credits !== undefined && planDetails.credits !== null ? Number(planDetails.credits) : (isUnlimited ? -1 : 100)
      },
      stats: {
        activeSessions: activeDevices,
        accessibleTools: accessibleAccounts.length,
        projectsCount,
        daysRemaining,
        isExpired,
        credits: userCredits,
        isUnlimitedCredits: isUnlimited
      },
      credits: userCredits,
      isUnlimitedCredits: isUnlimited,
      daysRemaining,
      expiresAt: finalExpiresAt,
      sharedAccountsCount: accessibleAccounts.length,
      activeSessionsCount: activeDevices,
      projectsCount,
      recentProjects: userProjects,
      recentAccounts: accessibleAccounts.slice(0, 5).map(acc => ({
        id: acc.id,
        service: acc.service_name,
        name: acc.service_name,
        target_url: acc.target_url,
        status: 'active'
      }))
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch user dashboard', details: error.message });
  }
});

// 2. User Resources / Shared Tools: GET /api/user/resources
app.get('/api/user/resources', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    if (user.role === 'reseller') {
      return res.status(403).json({ error: 'Reseller partner accounts cannot access shared resource accounts directly. Please use a customer account.' });
    }

    const pool = getPool();
    // Select shared accounts (DO NOT EXPOSE raw cookies column!)
    const [accRows] = await pool.query(
      "SELECT id, service_name, target_url, description, cookie_version, status, allowed_plans, updated_at FROM shared_accounts WHERE status = 'active' ORDER BY service_name ASC"
    );

    const [userSessions] = await pool.query(
      'SELECT account_id, last_active FROM extension_sessions WHERE user_id = ?',
      [user.id]
    );
    const activeAccMap = {};
    userSessions.forEach(s => { activeAccMap[s.account_id] = s.last_active; });

    const uPlan = (user.plan || 'free').toLowerCase();
    const resources = accRows.map(acc => {
      let allowed = [];
      try {
        allowed = Array.isArray(acc.allowed_plans) ? acc.allowed_plans : JSON.parse(acc.allowed_plans || '[]');
      } catch {
        allowed = [];
      }
      const normAllowed = allowed.map(p => String(p).toLowerCase().replace('plan_', ''));
      const isAllowed = normAllowed.includes(uPlan.replace('plan_', '')) || normAllowed.includes('*') || user.role === 'admin';

      return {
        id: acc.id,
        name: acc.service_name,
        service: acc.service_name,
        service_name: acc.service_name,
        target_url: acc.target_url,
        description: acc.description,
        isAllowed,
        hasActiveSession: Boolean(activeAccMap[acc.id]),
        lastUsed: activeAccMap[acc.id] || null,
        status: acc.status
      };
    });

    res.json({ success: true, resources });
  } catch (error) {
    console.error('User resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources', details: error.message });
  }
});

// 3. User Sessions / Devices: GET /api/user/sessions
app.get('/api/user/sessions', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    if (user.role === 'reseller') {
      return res.status(403).json({ error: 'Resellers cannot access shared sessions.' });
    }

    const pool = getPool();
    const [sessions] = await pool.query(
      `SELECT es.id, es.account_id, es.device_id, es.last_active, es.created_at,
              sa.service_name, sa.target_url
       FROM extension_sessions es
       LEFT JOIN shared_accounts sa ON es.account_id = sa.id
       WHERE es.user_id = ?
       ORDER BY es.last_active DESC`,
      [user.id]
    );

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('User sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
});

// 4. User Revoke Session: DELETE /api/user/sessions/:id
app.delete('/api/user/sessions/:id', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const pool = getPool();
    await pool.query('DELETE FROM extension_sessions WHERE id = ? AND user_id = ?', [req.params.id, user.id]);
    res.json({ success: true, message: 'Device session disconnected.' });
  } catch (error) {
    console.error('User revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session', details: error.message });
  }
});

// 4b. User Projects: GET /api/user/projects
app.get('/api/user/projects', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, project_id, project_url, title, created_at, updated_at FROM user_projects WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    res.json({
      success: true,
      projects: rows
    });
  } catch (error) {
    console.error('User projects list error:', error);
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
});

// 4c. Delete User Project: DELETE /api/user/projects/:id
app.delete('/api/user/projects/:id', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    const pool = getPool();
    await pool.query('DELETE FROM user_projects WHERE id = ? AND user_id = ?', [req.params.id, user.id]);
    res.json({ success: true, message: 'Project removed from saved list.' });
  } catch (error) {
    console.error('User delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project', details: error.message });
  }
});

// 4d. Rename User Project: PUT /api/user/projects/:id
app.put('/api/user/projects/:id', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    const { title } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    const pool = getPool();
    await pool.query('UPDATE user_projects SET title = ? WHERE id = ? AND user_id = ?', [title.trim().substring(0, 255), req.params.id, user.id]);
    res.json({ success: true, message: 'Project title updated.' });
  } catch (error) {
    console.error('User update project error:', error);
    res.status(500).json({ error: 'Failed to update project', details: error.message });
  }
});
app.put('/api/user/profile', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Profile modification is disabled for user accounts. Please contact an administrator.' });
    }

    const { name, currentPassword, newPassword } = req.body;
    const pool = getPool();
    const updates = [];
    const params = [];

    if (name && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      const [uRows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [user.id]);
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(currentPassword, uRows[0].password_hash);
      if (!valid) {
        return res.status(400).json({ error: 'Incorrect current password.' });
      }
      const newHash = await bcrypt.hash(newPassword.trim(), 10);
      updates.push('password_hash = ?');
      params.push(newHash);
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No changes provided.' });
    }

    params.push(user.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('User profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// --------------------------------------------------------------------------
// EXTENSION RELEASES & FORCE UPDATE MANAGEMENT API
// --------------------------------------------------------------------------

// 1. Admin - Get Extension Release Information & History
app.get('/api/admin/extension', requireAdminRole, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM extension_releases ORDER BY created_at DESC');
    const current = rows.find((r) => r.is_active === 1) || rows[0] || null;
    const latestVersion = current ? current.version : (rows[0]?.version || '1.0.0');
    const nextVersion = rows.length === 0 ? '1.0.0' : getNextSemver(latestVersion);

    res.json({
      success: true,
      current,
      latest_version: latestVersion,
      next_version: nextVersion,
      releases: rows
    });
  } catch (error) {
    console.error('Admin get extension error:', error);
    res.status(500).json({ error: 'Failed to fetch extension information.' });
  }
});

// 2. Admin - Upload New Extension Version (.zip, .crx)
app.post('/api/admin/extension/upload', requireAdminRole, uploadExtension.single('file'), async (req, res) => {
  try {
    const pool = getPool();
    const { version, min_version, force_update, release_notes } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please upload an extension file (.zip or .crx).' });
    }

    // Determine version: use supplied or calculate next auto-incremented version
    let cleanVersion = (version || '').replace(/^[vV]/, '').trim();
    if (!cleanVersion) {
      const [rows] = await pool.query('SELECT version FROM extension_releases ORDER BY created_at DESC LIMIT 1');
      const latest = rows[0]?.version;
      cleanVersion = rows.length === 0 ? '1.0.0' : getNextSemver(latest);
    }
    cleanVersion = cleanVersion.replace(/[^0-9.]/g, '') || '1.0.0';

    const cleanMinVersion = (min_version || cleanVersion).replace(/^[vV]/, '').trim();
    const isForced = (force_update === 'true' || force_update === '1' || force_update === 1 || force_update === true) ? 1 : 0;
    const notes = (release_notes || '').trim();

    // Standardized server file name: toolsbydcx_extension_v{version}.zip
    const standardFileName = `toolsbydcx_extension_v${cleanVersion}.zip`;
    const targetDiskPath = path.join(extensionUploadDir, standardFileName);

    // Rename uploaded temporary file to standard name
    if (file.path !== targetDiskPath) {
      if (fs.existsSync(targetDiskPath)) {
        try { fs.unlinkSync(targetDiskPath); } catch (_) {}
      }
      fs.renameSync(file.path, targetDiskPath);
    }

    const id = `ext_rel_${Date.now()}`;
    const relativePath = path.relative(path.join(__dirname, '..'), targetDiskPath).replace(/\\/g, '/');
    const downloadUrl = `/api/extension/download?id=${id}`;

    // Mark previous releases as inactive
    await pool.query('UPDATE extension_releases SET is_active = 0');

    // Insert new release as active with standardized file_name
    await pool.query(
      `INSERT INTO extension_releases 
       (id, version, min_version, force_update, file_name, file_path, file_size, release_notes, download_url, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [id, cleanVersion, cleanMinVersion, isForced, standardFileName, relativePath, file.size, notes, downloadUrl]
    );

    const [newRow] = await pool.query('SELECT * FROM extension_releases WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Extension v${cleanVersion} saved as "${standardFileName}"! ${isForced ? 'Mandatory update enforced.' : 'Optional update enabled.'}`,
      release: newRow[0]
    });
  } catch (error) {
    console.error('Admin upload extension error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload extension.' });
  }
});

// 3. Admin - Update Extension Settings (toggle force update or change notes without re-upload)
app.post('/api/admin/extension/settings', requireAdminRole, async (req, res) => {
  try {
    const pool = getPool();
    const { id, force_update, min_version, release_notes, version } = req.body;

    const isForced = (force_update === 'true' || force_update === '1' || force_update === 1 || force_update === true) ? 1 : 0;

    let targetId = id;
    if (!targetId) {
      const [currentRows] = await pool.query('SELECT id FROM extension_releases WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
      targetId = currentRows[0]?.id;
    }

    if (!targetId) {
      return res.status(404).json({ error: 'No active extension release found to update.' });
    }

    await pool.query(
      `UPDATE extension_releases 
       SET force_update = ?, 
           min_version = COALESCE(?, min_version), 
           release_notes = COALESCE(?, release_notes),
           version = COALESCE(?, version),
           updated_at = NOW()
       WHERE id = ?`,
      [isForced, min_version || null, release_notes || null, version || null, targetId]
    );

    const [updatedRows] = await pool.query('SELECT * FROM extension_releases WHERE id = ?', [targetId]);
    res.json({
      success: true,
      message: `Extension settings updated successfully. Force update is now ${isForced ? 'ON' : 'OFF'}.`,
      release: updatedRows[0]
    });
  } catch (error) {
    console.error('Admin update extension settings error:', error);
    res.status(500).json({ error: 'Failed to update extension settings.' });
  }
});

// 4. Download Extension (Strictly requires authenticated user token)
app.get('/api/extension/download', async (req, res) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token || token === 'undefined' || token === 'null' || !token.trim()) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in to download the extension package.',
        login_required: true
      });
    }

    const pool = getPool();
    let user = null;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
      if (rows.length > 0) user = rows[0];
    } catch (_) {
      return res.status(401).json({
        error: 'Invalid or expired session. Please sign in again to download the extension.',
        login_required: true
      });
    }

    if (!user) {
      return res.status(401).json({
        error: 'User account not found. Please sign in.',
        login_required: true
      });
    }

    const { id } = req.query;

    let row;
    if (id) {
      const [rows] = await pool.query('SELECT * FROM extension_releases WHERE id = ?', [id]);
      row = rows[0];
    } else {
      const [rows] = await pool.query('SELECT * FROM extension_releases WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
      row = rows[0];
    }

    if (!row) {
      return res.status(404).json({ error: 'No extension file available for download.' });
    }

    const fullFilePath = path.join(__dirname, '..', row.file_path);
    if (fs.existsSync(fullFilePath)) {
      return res.download(fullFilePath, row.file_name);
    } else {
      return res.status(404).json({
        error: 'Extension package file not found on disk. Please ask the administrator to upload the extension package.',
        release: row
      });
    }
  } catch (error) {
    console.error('Download extension error:', error);
    res.status(500).json({ error: 'Failed to download extension.' });
  }
});

// 5. Extension Runtime Version & Update Check (Public / Extension runtime)
app.get(['/api/extension/check-update', '/api/extension/version'], async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM extension_releases WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
    const current = rows[0];

    if (!current) {
      return res.json({
        ok: true,
        update_available: false,
        update_required: false,
        latest_version: '1.0.0',
        min_version: '1.0.0',
        force_update: false
      });
    }

    const clientVersion = req.query.version || req.headers['x-extension-version'] || '0.0.0';
    const isOutdated = compareSemver(clientVersion, current.version) < 0;
    const isBelowMin = compareSemver(clientVersion, current.min_version || current.version) < 0;
    const forceUpdateEnforced = Boolean(current.force_update) && (isBelowMin || isOutdated);

    res.json({
      ok: true,
      client_version: clientVersion,
      latest_version: current.version,
      min_version: current.min_version || current.version,
      force_update: Boolean(current.force_update),
      update_available: isOutdated,
      update_required: forceUpdateEnforced,
      download_url: current.download_url || '/api/extension/download',
      file_name: current.file_name,
      file_size: current.file_size,
      release_notes: current.release_notes,
      message: forceUpdateEnforced
        ? `Mandatory update required! Please update your ToolsByDcx extension to v${current.version}.`
        : (isOutdated ? `A new version (v${current.version}) of ToolsByDcx extension is available.` : 'Extension is up to date.')
    });
  } catch (error) {
    console.error('Extension check update error:', error);
    res.status(500).json({ ok: false, error: 'Failed to check extension version.' });
  }
});

// --------------------------------------------------------------------------
// SHARED ACCOUNTS & EXTENSION API
// --------------------------------------------------------------------------

// 1. Admin - Get All Shared Accounts
app.get('/api/admin/accounts', requireAdminRole, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM shared_accounts ORDER BY created_at DESC');

    const accounts = rows.map((acc) => {
      let cookieCount = 0;
      let parsedCookies = [];
      try {
        parsedCookies = typeof acc.cookies === 'string' ? JSON.parse(acc.cookies) : (acc.cookies || []);
        cookieCount = Array.isArray(parsedCookies) ? parsedCookies.length : 0;
      } catch (_) {}

      let allowedPlans = [];
      try {
        allowedPlans = typeof acc.allowed_plans === 'string' ? JSON.parse(acc.allowed_plans) : (acc.allowed_plans || []);
      } catch (_) {
        allowedPlans = ['pro', 'unlimited'];
      }

      return {
        ...acc,
        cookieCount,
        cookies: typeof acc.cookies === 'string' ? acc.cookies : JSON.stringify(acc.cookies, null, 2),
        allowed_plans: allowedPlans,
      };
    });

    res.json({ success: true, accounts });
  } catch (error) {
    console.error('Admin get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts', details: error.message });
  }
});

// 2. Admin - Create New Shared Account
app.post('/api/admin/accounts', requireAdminRole, async (req, res) => {
  try {
    const { service_name, target_url, description, cookies, status, allowed_plans, max_users } = req.body;

    if (!service_name || !target_url || !cookies) {
      return res.status(400).json({ error: 'Service name, target URL, and cookie data are required.' });
    }

    // Validate cookies JSON
    let cleanCookies = '';
    if (typeof cookies === 'string') {
      try {
        const parsed = JSON.parse(cookies);
        cleanCookies = JSON.stringify(parsed);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid Cookie JSON format. Please provide valid JSON array of cookies.' });
      }
    } else if (Array.isArray(cookies) || typeof cookies === 'object') {
      cleanCookies = JSON.stringify(cookies);
    }

    const pool = getPool();
    const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const allowedJson = JSON.stringify(Array.isArray(allowed_plans) ? allowed_plans : ['plan_pro', 'plan_unlimited', 'pro', 'unlimited']);

    await pool.query(
      `INSERT INTO shared_accounts (id, service_name, target_url, description, cookies, cookie_version, status, allowed_plans, max_users)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        accountId,
        service_name.trim(),
        target_url.trim(),
        description ? description.trim() : '',
        cleanCookies,
        status || 'active',
        allowedJson,
        Number(max_users) || 100,
      ]
    );

    res.json({
      success: true,
      message: `Account "${service_name}" created successfully.`,
      accountId,
    });
  } catch (error) {
    console.error('Admin create account error:', error);
    res.status(500).json({ error: 'Failed to create account', details: error.message });
  }
});

// 3. Admin - Update Shared Account
app.put('/api/admin/accounts/:id', requireAdminRole, async (req, res) => {
  try {
    const accountId = req.params.id;
    const { service_name, target_url, description, cookies, status, allowed_plans, max_users } = req.body;

    const pool = getPool();
    const [existing] = await pool.query('SELECT * FROM shared_accounts WHERE id = ?', [accountId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const current = existing[0];
    let cleanCookies = current.cookies;
    let bumpedVersion = current.cookie_version || 1;

    if (cookies !== undefined) {
      let candidate = '';
      if (typeof cookies === 'string') {
        try {
          const parsed = JSON.parse(cookies);
          candidate = JSON.stringify(parsed);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid Cookie JSON format.' });
        }
      } else {
        candidate = JSON.stringify(cookies);
      }
      if (candidate !== current.cookies) {
        cleanCookies = candidate;
        bumpedVersion = (current.cookie_version || 1) + 1;
      }
    }

    const allowedJson = allowed_plans !== undefined
      ? JSON.stringify(Array.isArray(allowed_plans) ? allowed_plans : [allowed_plans])
      : current.allowed_plans;

    await pool.query(
      `UPDATE shared_accounts
       SET service_name = ?, target_url = ?, description = ?, cookies = ?, cookie_version = ?, status = ?, allowed_plans = ?, max_users = ?
       WHERE id = ?`,
      [
        service_name !== undefined ? service_name.trim() : current.service_name,
        target_url !== undefined ? target_url.trim() : current.target_url,
        description !== undefined ? description.trim() : current.description,
        cleanCookies,
        bumpedVersion,
        status !== undefined ? status : current.status,
        allowedJson,
        max_users !== undefined ? Number(max_users) : current.max_users,
        accountId,
      ]
    );

    res.json({
      success: true,
      message: `Account updated successfully (Cookie Version: ${bumpedVersion}).`,
      cookieVersion: bumpedVersion,
    });
  } catch (error) {
    console.error('Admin update account error:', error);
    res.status(500).json({ error: 'Failed to update account', details: error.message });
  }
});

// 4. Admin - Toggle Account Status (active / paused)
app.post('/api/admin/accounts/:id/toggle', requireAdminRole, async (req, res) => {
  try {
    const accountId = req.params.id;
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, status FROM shared_accounts WHERE id = ?', [accountId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Account not found.' });

    const newStatus = rows[0].status === 'active' ? 'paused' : 'active';
    await pool.query('UPDATE shared_accounts SET status = ? WHERE id = ?', [newStatus, accountId]);

    res.json({ success: true, status: newStatus, message: `Account status updated to ${newStatus}.` });
  } catch (error) {
    console.error('Admin toggle account error:', error);
    res.status(500).json({ error: 'Failed to toggle status', details: error.message });
  }
});

// 5. Admin - Delete Shared Account
app.delete('/api/admin/accounts/:id', requireAdminRole, async (req, res) => {
  try {
    const accountId = req.params.id;
    const pool = getPool();
    await pool.query('DELETE FROM shared_accounts WHERE id = ?', [accountId]);
    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Admin delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

// --------------------------------------------------------------------------
// EXTENSION RUNTIME ENDPOINTS
// --------------------------------------------------------------------------

// 6. Extension - Inject Cookies
app.post(['/api/extension/inject-cookies', '/api/extension2/inject-cookies'], async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Unauthorized: Please log in to your ToolsByDcx dashboard.',
        forceSignout: true,
      });
    }

    if (user.role === 'reseller') {
      return res.status(403).json({
        ok: false,
        error: 'Access denied: Reseller accounts cannot directly consume shared resources on behalf of their reseller account. Please use a designated customer account.',
        forceSignout: true,
      });
    }

    const deviceId = req.headers['x-bf-device-id'] || (req.body && req.body.deviceId) || 'default_device';
    const pool = getPool();

    // Check if extension is outdated and force update is active
    const clientExtVersion = req.headers['x-extension-version'] || (req.body && req.body.extensionVersion) || (req.query && req.query.extensionVersion);
    if (clientExtVersion) {
      const [releaseRows] = await pool.query('SELECT * FROM extension_releases WHERE is_active = 1 LIMIT 1');
      if (releaseRows.length > 0 && releaseRows[0].force_update) {
        const minV = releaseRows[0].min_version || releaseRows[0].version;
        if (compareSemver(clientExtVersion, minV) < 0) {
          return res.status(426).json({
            ok: false,
            update_required: true,
            force_update: true,
            latest_version: releaseRows[0].version,
            download_url: releaseRows[0].download_url || '/api/extension/download',
            error: `Your ToolsByDcx extension (v${clientExtVersion}) is outdated. An update to v${releaseRows[0].version} is required by the administrator to access tools.`
          });
        }
      }
    }

    // Query active accounts
    const [accounts] = await pool.query("SELECT * FROM shared_accounts WHERE status = 'active' ORDER BY updated_at DESC");

    if (accounts.length === 0) {
      return res.status(503).json({
        ok: false,
        error: 'No active shared accounts currently available. Please contact administrator.',
      });
    }

    // Match account with user's plan
    let targetAccount = null;
    const userPlan = (user.plan || 'free').toLowerCase();
    const cleanUserPlan = userPlan.replace('plan_', '');

    for (const acc of accounts) {
      let allowed = ['free', 'pro', 'unlimited'];
      try {
        if (typeof acc.allowed_plans === 'string') allowed = JSON.parse(acc.allowed_plans);
        else if (Array.isArray(acc.allowed_plans)) allowed = acc.allowed_plans;
      } catch (_) {}

      const normalizedAllowed = allowed.map((p) => String(p).toLowerCase().replace('plan_', ''));
      if (
        normalizedAllowed.includes(cleanUserPlan) ||
        normalizedAllowed.includes(userPlan) ||
        normalizedAllowed.includes('*') ||
        user.role === 'admin'
      ) {
        targetAccount = acc;
        break;
      }
    }

    if (!targetAccount) {
      if (
        cleanUserPlan === 'pro' ||
        cleanUserPlan === 'unlimited' ||
        cleanUserPlan === 'ultra' ||
        user.role === 'admin'
      ) {
        targetAccount = accounts[0];
      } else {
        return res.status(403).json({
          ok: false,
          error: `Your current plan (${userPlan}) does not have access to this shared pool. Please upgrade your plan in ToolsByDcx.`,
          upgradeRequired: true,
        });
      }
    }

    // Parse cookies safely
    let parsedCookies = [];
    try {
      if (typeof targetAccount.cookies === 'string') {
        parsedCookies = JSON.parse(targetAccount.cookies);
      } else if (Array.isArray(targetAccount.cookies)) {
        parsedCookies = targetAccount.cookies;
      }
    } catch (parseErr) {
      console.warn('Cookie parse error for account:', targetAccount.id, parseErr.message);
    }

    // Record session access (unique row per user + device)
    try {
      const sessId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pool.query(
        `INSERT INTO extension_sessions (id, user_id, account_id, device_id, last_active)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE account_id = VALUES(account_id), last_active = NOW()`,
        [sessId, user.id, targetAccount.id, deviceId]
      );
    } catch (sessErr) {
      console.warn('Session record warning:', sessErr.message);
    }

    res.json({
      ok: true,
      cookies: parsedCookies,
      sessionId: targetAccount.id,
      sessionLabel: targetAccount.service_name,
      plan: userPlan,
      tier: userPlan,
      cookieVersion: targetAccount.cookie_version || 1,
      accountUrl: targetAccount.target_url,
    });
  } catch (error) {
    console.error('Extension inject cookies error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error while injecting cookies.' });
  }
});

// 7. Extension - Session Verification Guard
app.post(['/api/extension/verify', '/api/extension2/verify'], async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({
        ok: false,
        valid: false,
        forceSignout: true,
        error: 'Session expired or not authenticated. Please log in.',
      });
    }

    if (user.role === 'reseller') {
      return res.status(403).json({
        ok: false,
        valid: false,
        forceSignout: true,
        error: 'Access denied: Reseller accounts cannot be used directly in the Chrome extension.',
      });
    }

    const pool = getPool();

    // Check if extension is outdated and force update is active
    const clientExtVersion = req.headers['x-extension-version'] || (req.body && req.body.extensionVersion) || (req.query && req.query.extensionVersion);
    if (clientExtVersion) {
      const [releaseRows] = await pool.query('SELECT * FROM extension_releases WHERE is_active = 1 LIMIT 1');
      if (releaseRows.length > 0 && releaseRows[0].force_update) {
        const minV = releaseRows[0].min_version || releaseRows[0].version;
        if (compareSemver(clientExtVersion, minV) < 0) {
          return res.status(426).json({
            ok: false,
            valid: false,
            update_required: true,
            force_update: true,
            latest_version: releaseRows[0].version,
            download_url: releaseRows[0].download_url || '/api/extension/download',
            error: `Your ToolsByDcx extension (v${clientExtVersion}) is outdated. An update to v${releaseRows[0].version} is required by the administrator.`
          });
        }
      }
    }

    const [uRows] = await pool.query(
      'SELECT u.*, p.credits as plan_credits, p.duration_days as plan_duration, p.billing_cycle as plan_billing_cycle FROM users u LEFT JOIN plans p ON (u.plan = p.id OR (p.id = CONCAT("plan_", u.plan))) WHERE u.id = ?',
      [user.id]
    );
    const fullUser = uRows[0] || user;
    const userPlan = (fullUser.plan || 'pro').toLowerCase();
    const isUnlimited = userPlan.includes('unlimited') || userPlan.includes('max') || fullUser.credits === -1 || fullUser.plan_credits === -1;
    const creditsLeft = isUnlimited ? 999999 : (fullUser.credits !== null && fullUser.credits !== undefined ? Number(fullUser.credits) : 100);

    const isLifetime = fullUser.plan_billing_cycle === 'lifetime' || Number(fullUser.plan_duration) >= 3650;
    let daysRemaining = null;
    let planExpiresAt = null;

    if (isLifetime) {
      daysRemaining = null;
      planExpiresAt = null;
    } else {
      const planDuration = Number(fullUser.plan_duration) || 30;
      const createdAt = fullUser.created_at ? new Date(fullUser.created_at) : new Date();
      const elapsedDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, planDuration - Math.max(0, elapsedDays));
      planExpiresAt = new Date(createdAt.getTime() + planDuration * 86400000).toISOString();
    }

    res.json({
      ok: true,
      valid: true,
      user: {
        id: fullUser.id,
        name: fullUser.name,
        email: fullUser.email,
        plan: fullUser.plan || 'pro',
        creditsLeft: creditsLeft,
        credits: creditsLeft,
        daysRemaining: daysRemaining,
        planExpiresAt: planExpiresAt,
      },
      cookieSystemDisabled: false,
    });
  } catch (error) {
    console.error('Extension verify error:', error);
    res.status(500).json({ ok: false, valid: false, error: error.message });
  }
});

// 8. Extension - Cookie Version Check
app.all(['/api/extension/cookie-version', '/api/extension2/cookie-version'], async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT MAX(cookie_version) as max_v FROM shared_accounts');
    const version = rows[0]?.max_v || 1;
    res.json({ ok: true, version: String(version) });
  } catch (error) {
    res.json({ ok: true, version: '1' });
  }
});

// 9. Extension - Switch Account
app.post(['/api/extension/switch-account', '/api/extension2/switch-account'], async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized', forceSignout: true });
    }
    if (user.role === 'reseller') {
      return res.status(403).json({ ok: false, error: 'Reseller accounts cannot switch shared accounts.' });
    }

    const currentAccountId = req.body && req.body.currentAccountId;
    const pool = getPool();
    const [accounts] = await pool.query("SELECT * FROM shared_accounts WHERE status = 'active' ORDER BY updated_at DESC");

    if (accounts.length === 0) {
      return res.status(503).json({ ok: false, error: 'No active shared accounts available' });
    }

    const nextAcc = accounts.find((a) => a.id !== currentAccountId) || accounts[0];
    let parsedCookies = [];
    try {
      parsedCookies = typeof nextAcc.cookies === 'string' ? JSON.parse(nextAcc.cookies) : nextAcc.cookies;
    } catch (_) {}

    res.json({
      ok: true,
      sessionId: nextAcc.id,
      sessionLabel: nextAcc.service_name,
      cookies: parsedCookies,
      cookieVersion: nextAcc.cookie_version || 1,
      accountUrl: nextAcc.target_url,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// 10. Auth - Refresh Token
app.post('/api/auth/refresh-token', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ ok: true, token, user });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// 11. User - Quota / Credits for Extension Popup & Content Script
app.all(['/api/user/free-quota', '/api/user/credits'], async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.json({ enforced: false, creditsRemaining: 0, creditsLeft: 0 });
    }
    const pool = getPool();
    const [uRows] = await pool.query(
      'SELECT u.*, p.credits as plan_credits FROM users u LEFT JOIN plans p ON (u.plan = p.id OR (p.id = CONCAT("plan_", u.plan))) WHERE u.id = ?',
      [user.id]
    );
    const fullUser = uRows[0] || user;
    const userPlan = (fullUser.plan || 'free').toLowerCase();
    const isUnlimited = userPlan.includes('unlimited') || userPlan.includes('max') || fullUser.credits === -1 || fullUser.plan_credits === -1;

    if (isUnlimited) {
      return res.json({
        enforced: false,
        creditsRemaining: 999999,
        creditsLeft: 999999,
        creditsDisplay: '∞',
        plan: fullUser.plan
      });
    }

    const credits = fullUser.credits !== null && fullUser.credits !== undefined ? Number(fullUser.credits) : 0;
    return res.json({
      enforced: true,
      creditsRemaining: credits,
      creditsLeft: credits,
      creditsDisplay: String(credits),
      plan: fullUser.plan
    });
  } catch (err) {
    console.error('Free quota error:', err);
    res.json({ enforced: false, creditsRemaining: 0, creditsLeft: 0 });
  }
});

// 12. Extension - Use Credits / Deduct on Generation Completion
app.post(['/api/extension/use-credits', '/api/extension/use-omni-credits', '/api/extension/generate'], async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized', forceSignout: true });
    }

    const pool = getPool();
    const [uRows] = await pool.query(
      'SELECT u.*, p.credits as plan_credits FROM users u LEFT JOIN plans p ON (u.plan = p.id OR (p.id = CONCAT("plan_", u.plan))) WHERE u.id = ?',
      [user.id]
    );
    if (uRows.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }
    const fullUser = uRows[0];
    const userPlan = (fullUser.plan || 'free').toLowerCase();
    const isUnlimited = userPlan.includes('unlimited') || userPlan.includes('max') || fullUser.credits === -1 || fullUser.plan_credits === -1;

    if (isUnlimited) {
      return res.json({
        ok: true,
        enforced: false,
        creditsRemaining: 999999,
        creditsLeft: 999999,
        omniCreditsLeft: 999999
      });
    }

    const currentCredits = fullUser.credits !== null && fullUser.credits !== undefined ? Number(fullUser.credits) : 0;
    const cost = Number(req.body?.cost || (req.body?.qty ? req.body.qty * 50 : 50));

    if (currentCredits < cost) {
      return res.status(402).json({
        ok: false,
        error: 'OMNI_CREDITS_EXHAUSTED',
        message: `Insufficient credits. ${cost} credits required per video generation.`,
        creditsRemaining: currentCredits,
        creditsLeft: currentCredits,
        omniCreditsLeft: currentCredits,
        poolSwitchInSeconds: 0
      });
    }

    const newBalance = Math.max(0, currentCredits - cost);
    await pool.query('UPDATE users SET credits = ? WHERE id = ?', [newBalance, fullUser.id]);

    res.json({
      ok: true,
      enforced: true,
      deducted: cost,
      creditsRemaining: newBalance,
      creditsLeft: newBalance,
      omniCreditsLeft: newBalance
    });
  } catch (error) {
    console.error('Use credits error:', error);
    res.status(500).json({ ok: false, error: 'Failed to process credits deduction', details: error.message });
  }
});

// 13. Extension - Save Project for User: POST /api/extension/save-project
app.post(['/api/extension/save-project', '/api/extension2/save-project'], async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized. User session not active.' });
    }
    const { projectId, projectUrl, title } = req.body || {};
    if (!projectId || !projectUrl) {
      return res.status(400).json({ ok: false, error: 'projectId and projectUrl are required.' });
    }

    const pool = getPool();
    const id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const cleanTitle = (title && typeof title === 'string' && title.trim()) ? title.trim().substring(0, 255) : 'Flow Project';

    await pool.query(
      `INSERT INTO user_projects (id, user_id, project_id, project_url, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         project_url = VALUES(project_url),
         updated_at = NOW()`,
      [id, user.id, projectId, projectUrl, cleanTitle]
    );

    console.log(`[ToolsByDcx] 📁 Saved project for user ${user.id}: ${projectId} (${cleanTitle})`);

    res.json({
      ok: true,
      message: 'Project saved successfully.',
      project: {
        id,
        user_id: user.id,
        project_id: projectId,
        project_url: projectUrl,
        title: cleanTitle
      }
    });
  } catch (err) {
    console.error('Error saving user project from extension:', err);
    res.status(500).json({ ok: false, error: 'Failed to save project', details: err.message });
  }
});

// SPA fallback for React App
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Start server after database initialization
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CCNA Exam API Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Server failed to start due to database error:', err);
    process.exit(1);
  });
