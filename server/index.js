require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDB, getPool } = require('./db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./mailer');

const app = express();
const PORT = process.env.SERVER_PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'ccna_exam_jwt_secret_key_2026_secure';

app.use(cors());
app.use(express.json());

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

// 1. User Registration (Signup)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const pool = getPool();

    // Check if user already exists
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      if (existing[0].is_verified) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      }
      // If user exists but not verified, generate new OTP and update
      const otp = generateOTP();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      await pool.query(
        `UPDATE users SET name = ?, password_hash = ?, verification_code = ?, verification_expires_at = ? WHERE email = ?`,
        [cleanName, hash, otp, expiresAt, cleanEmail]
      );

      // Dispatch real email via Hostinger SMTP
      try {
        await sendVerificationEmail(cleanEmail, cleanName, otp);
        console.log(`✉️ [HOSTINGER SMTP] Verification email dispatched to ${cleanEmail}`);
      } catch (mailErr) {
        console.warn(`⚠️ [HOSTINGER SMTP] Failed to send email to ${cleanEmail}:`, mailErr.message);
      }

      console.log(`\n======================================================`);
      console.log(`✉️ [EMAIL VERIFICATION CODE] Sent to: ${cleanEmail}`);
      console.log(`🔑 Verification OTP Code: ${otp}`);
      console.log(`⏳ Valid for: 15 minutes`);
      console.log(`======================================================\n`);

      return res.status(200).json({
        success: true,
        message: `Verification code sent to ${cleanEmail}. Please check your inbox or spam folder.`,
        email: cleanEmail,
        isVerified: false,
        devOtp: otp, // helpful in dev preview
      });
    }

    // New user
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const otp = generateOTP();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, is_verified, verification_code, verification_expires_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [userId, cleanName, cleanEmail, hash, otp, expiresAt]
    );

    // Dispatch real email via Hostinger SMTP
    try {
      await sendVerificationEmail(cleanEmail, cleanName, otp);
      console.log(`✉️ [HOSTINGER SMTP] Verification email dispatched to ${cleanEmail}`);
    } catch (mailErr) {
      console.warn(`⚠️ [HOSTINGER SMTP] Failed to send email to ${cleanEmail}:`, mailErr.message);
    }

    console.log(`\n======================================================`);
    console.log(`✉️ [EMAIL VERIFICATION CODE] Sent to: ${cleanEmail}`);
    console.log(`🔑 Verification OTP Code: ${otp}`);
    console.log(`⏳ Valid for: 15 minutes`);
    console.log(`======================================================\n`);

    res.status(201).json({
      success: true,
      message: `Account created! Verification code sent to ${cleanEmail}.`,
      email: cleanEmail,
      isVerified: false,
      devOtp: otp,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.', details: error.message });
  }
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
       (SELECT r.name FROM users r WHERE r.id = u.reseller_id) as reseller_name
       FROM users u WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const user = rows[0];
    let daysRemaining = null;
    let isExpired = false;
    if (user.expires_at) {
      const diffMs = new Date(user.expires_at).getTime() - Date.now();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        isExpired = true;
        daysRemaining = 0;
      }
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
        expires_at: user.expires_at,
        daysRemaining,
        isExpired,
        isLifetime: !user.expires_at,
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
    const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
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
      stats: { totalUsers: 1, verifiedUsers: 1, activePlans: 3, totalAccounts: 1, activeAccounts: 1, activeSessions: 0 },
      recentUsers: []
    });
  }
});

// 2. Admin Users List
app.get('/api/admin/users', requireAdminRole, async (req, res) => {
  try {
    const pool = getPool();
    const { search, role, status } = req.query;

    let sql = `SELECT u.id, u.name, u.email, u.role, u.reseller_id, u.plan, u.credits, u.expires_at, u.is_verified, u.created_at,
               (SELECT r.name FROM users r WHERE r.id = u.reseller_id) as reseller_name
               FROM users u WHERE 1=1`;
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (role && role.trim()) {
      sql += ' AND u.role = ?';
      params.push(role.trim());
    }
    if (status === 'verified') {
      sql += ' AND u.is_verified = 1';
    } else if (status === 'unverified') {
      sql += ' AND u.is_verified = 0';
    }

    sql += ' ORDER BY u.created_at DESC';
    const [users] = await pool.query(sql, params);

    const annotated = users.map(u => {
      let daysRemaining = null;
      let isExpired = false;
      if (u.expires_at) {
        const diffMs = new Date(u.expires_at).getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          isExpired = true;
          daysRemaining = 0;
        }
      }
      return {
        ...u,
        credits: u.credits !== null && u.credits !== undefined ? Number(u.credits) : 100,
        daysRemaining,
        isExpired,
        isLifetime: !u.expires_at
      };
    });

    res.json({ users: annotated });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// 3. Admin Create User
app.post('/api/admin/users', requireAdminRole, async (req, res) => {
  try {
    const { name, email, password, role, plan, credits, isVerified } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pool = getPool();

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    let userCredits = credits !== undefined && credits !== null ? Number(credits) : null;
    if (userCredits === null) {
      const selectedPlan = plan || 'free';
      const [planRows] = await pool.query('SELECT credits FROM plans WHERE id = ? OR id = ? LIMIT 1', [selectedPlan, `plan_${selectedPlan}`]);
      userCredits = planRows.length > 0 && planRows[0].credits !== null ? Number(planRows[0].credits) : 100;
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password || 'Password123!', salt);

    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, is_verified, role, plan, credits) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name.trim(), cleanEmail, hash, isVerified ? 1 : 0, role || 'user', plan || 'free', userCredits]
    );

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
    const { name, email, role, plan, credits, is_verified, password } = req.body;

    const pool = getPool();
    const updates = ['name = ?', 'email = ?', 'role = ?', 'plan = ?', 'is_verified = ?'];
    const params = [name, email ? email.trim().toLowerCase() : '', role || 'user', plan || 'free', is_verified ? 1 : 0];

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
    if (userRows.length > 0 && (userRows[0].email === 'candidate@ccna.com' || userRows[0].email === 'admin@system.com')) {
      return res.status(403).json({ error: 'Primary admin account cannot be deleted.' });
    }

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
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  } else if (req.body && (req.body.token || req.body.sessionToken)) {
    token = req.body.token || req.body.sessionToken;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  const directUserId = req.headers['x-user-id'];

  if (!token && !directUserId) return null;

  const pool = getPool();

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const [rows] = await pool.query('SELECT id, name, email, role, reseller_id, plan, expires_at, is_verified FROM users WHERE id = ?', [decoded.id]);
      if (rows.length > 0) return rows[0];
    } catch (err) {
      try {
        const [rows] = await pool.query('SELECT id, name, email, role, reseller_id, plan, expires_at, is_verified FROM users WHERE id = ? OR email = ?', [token, token]);
        if (rows.length > 0) return rows[0];
      } catch (_) {}
    }
  }

  if (directUserId) {
    try {
      const [rows] = await pool.query('SELECT id, name, email, role, reseller_id, plan, expires_at, is_verified FROM users WHERE id = ?', [directUserId]);
      if (rows.length > 0) return rows[0];
    } catch (_) {}
  }

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

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsersRows[0].count,
        activeUsers: activeUsersRows[0].count,
        expiringSoon: expiringSoonRows[0].count,
        expiredUsers: expiredRows[0].count
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

    let sql = 'SELECT id, name, email, role, plan, expires_at, is_verified, created_at FROM users WHERE reseller_id = ?';
    const params = [resellerId];

    if (search && search.trim()) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (plan && plan.trim()) {
      sql += ' AND (plan = ? OR plan = ?)';
      params.push(plan.trim(), `plan_${plan.trim()}`);
    }
    if (status === 'active') {
      sql += ' AND is_verified = 1 AND (expires_at IS NULL OR expires_at > NOW())';
    } else if (status === 'expired') {
      sql += ' AND expires_at <= NOW()';
    } else if (status === 'suspended') {
      sql += ' AND is_verified = 0';
    }

    sql += ' ORDER BY created_at DESC';
    const [users] = await pool.query(sql, params);

    const annotated = users.map(u => {
      let daysRemaining = null;
      let isExpired = false;
      if (u.expires_at) {
        const diffMs = new Date(u.expires_at).getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          isExpired = true;
          daysRemaining = 0;
        }
      }
      return {
        ...u,
        daysRemaining,
        isExpired,
        isLifetime: !u.expires_at
      };
    });

    res.json({ success: true, users: annotated });
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

    const cleanEmail = email.trim().toLowerCase();
    const pool = getPool();

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

    let daysRemaining = null;
    let isExpired = false;
    if (profile.expires_at) {
      const diffMs = new Date(profile.expires_at).getTime() - Date.now();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        isExpired = true;
        daysRemaining = 0;
      }
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
        expires_at: profile.expires_at,
        daysRemaining,
        isExpired,
        isLifetime: !profile.expires_at,
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
        daysRemaining,
        isExpired,
        credits: userCredits,
        isUnlimitedCredits: isUnlimited
      },
      credits: userCredits,
      isUnlimitedCredits: isUnlimited,
      daysRemaining,
      expiresAt: profile.expires_at,
      sharedAccountsCount: accessibleAccounts.length,
      activeSessionsCount: activeDevices,
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

// 5. User Update Profile & Password: PUT /api/user/profile
app.put('/api/user/profile', async (req, res) => {
  try {
    const user = await authenticateUserOrExtension(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
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
        error: 'Unauthorized: Please log in to your FlowByDcx dashboard.',
        forceSignout: true,
      });
    }

    const deviceId = req.headers['x-bf-device-id'] || (req.body && req.body.deviceId) || 'default_device';
    const pool = getPool();

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
          error: `Your current plan (${userPlan}) does not have access to this shared pool. Please upgrade your plan in FlowByDcx.`,
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

    const pool = getPool();
    const [uRows] = await pool.query(
      'SELECT u.*, p.credits as plan_credits FROM users u LEFT JOIN plans p ON (u.plan = p.id OR (p.id = CONCAT("plan_", u.plan))) WHERE u.id = ?',
      [user.id]
    );
    const fullUser = uRows[0] || user;
    const userPlan = (fullUser.plan || 'pro').toLowerCase();
    const isUnlimited = userPlan.includes('unlimited') || userPlan.includes('max') || fullUser.credits === -1 || fullUser.plan_credits === -1;
    const creditsLeft = isUnlimited ? 999999 : (fullUser.credits !== null && fullUser.credits !== undefined ? Number(fullUser.credits) : 100);

    let daysRemaining = 30;
    if (fullUser.expires_at) {
      const diff = new Date(fullUser.expires_at).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
        planExpiresAt: fullUser.expires_at ? new Date(fullUser.expires_at).toISOString() : new Date(Date.now() + 365 * 86400000).toISOString(),
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
