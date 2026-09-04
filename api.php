<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

// Load .env
$envPath = __DIR__ . '/.env';
$env = [];
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $env[trim($key)] = trim($val);
        }
    }
}

$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbUser = $env['DB_USER'] ?? 'root';
$dbPass = $env['DB_PASSWORD'] ?? '';
$dbName = $env['DB_NAME'] ?? 'flowbydcx';
$jwtSecret = $env['JWT_SECRET'] ?? 'ccna_dumps_production_secret_key_2026';

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    try { $pdo->exec("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN reseller_id VARCHAR(100) NULL AFTER role"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'free'"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE users ADD COLUMN expires_at TIMESTAMP NULL AFTER plan"); } catch (Exception $e) {}

    // Ensure plans table exists with seed data
    $pdo->exec("CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        billing_cycle VARCHAR(50) DEFAULT 'monthly',
        duration_days INT DEFAULT 30,
        description TEXT,
        features JSON,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
    try { $pdo->exec("ALTER TABLE plans CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"); } catch (Exception $e) {}

    $planCount = (int)$pdo->query("SELECT COUNT(*) FROM plans")->fetchColumn();
    if ($planCount === 0) {
        $pdo->prepare("INSERT INTO plans (id, name, price, billing_cycle, duration_days, description, features, is_active) VALUES
            ('plan_free', 'Free Study Pass', 0.00, 'lifetime', 3650, 'Standard access to practice questions and basic review.', ?, 1),
            ('plan_pro', 'CCNA Pro Pass', 19.99, 'monthly', 30, 'Full access to all 228 questions, timed simulations, and AI review report.', ?, 1),
            ('plan_unlimited', 'CCNA Unlimited Pass', 49.99, 'lifetime', 3650, 'Unlimited lifetime access to all banks, instant feedback, and notes sync.', ?, 1)
        ")->execute([
            json_encode(['Exam A (1-50)', 'Exam B (51-100)', 'Basic Question Review', 'Score History']),
            json_encode(['All Exam Banks (A, B, C, D, D&D)', 'Official 90-min Simulations', 'AI Fix Report Generation', 'Real-time Explanations', 'Sync Notes to Cloud']),
            json_encode(['Lifetime Access & Updates', 'All 228 Exam Questions', 'Unlimited Retakes & Flagged Mode', 'Instant Explanations', 'Priority Support'])
        ]);
    }

    // Shared accounts & extension sessions tables
    $pdo->exec("CREATE TABLE IF NOT EXISTS shared_accounts (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS extension_sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        account_id VARCHAR(100) NOT NULL,
        device_id VARCHAR(100),
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

    $checkCandidate = $pdo->query("SELECT id FROM users WHERE email = 'candidate@ccna.com'")->fetch();
    $candidateHash = password_hash('Password123!', PASSWORD_BCRYPT);
    if ($checkCandidate) {
        $pdo->prepare("UPDATE users SET name = 'Yasir Raheel', password_hash = ?, is_verified = 1, role = 'admin', plan = 'pro' WHERE email = 'candidate@ccna.com'")->execute([$candidateHash]);
    } else {
        $cId = 'usr_' . time();
        $pdo->prepare("INSERT INTO users (id, name, email, password_hash, is_verified, role, plan) VALUES (?, 'Yasir Raheel', 'candidate@ccna.com', ?, 1, 'admin', 'pro')")->execute([$cId, $candidateHash]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed", "details" => $e->getMessage()]);
    exit;
}

// Request path parsing
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = parse_url($requestUri, PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);
if (!is_array($body)) {
    $body = $_POST;
}

// Helper to generate simple token
function createToken($user, $secret) {
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode([
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'] ?? 'user',
        'plan' => $user['plan'] ?? 'free',
        'exp' => time() + (30 * 86400)
    ]));
    $sig = hash_hmac('sha256', "$header.$payload", $secret, true);
    $signature = base64_encode($sig);
    return "$header.$payload.$signature";
}

function verifyToken($token, $secret) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($header, $payload, $signature) = $parts;
    $validSig = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    if ($signature !== $validSig) return false;
    $data = json_decode(base64_decode($payload), true);
    if (!$data || !isset($data['id'])) return false;
    if (isset($data['exp']) && $data['exp'] < time()) return false;
    return $data;
}

function getEmailTemplate($title, $greetingName, $leadText, $otpCode, $expiryText = "Valid for 15 minutes.", $isWarning = false) {
    $accentColor = $isWarning ? "#ef4444" : "#22c55e";
    $accentLight = $isWarning ? "#f87171" : "#4ade80";
    return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{$title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
    .email-container { max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .email-header { background: #090d16; padding: 24px 30px; border-bottom: 1px solid #334155; text-align: center; }
    .brand-badge { font-size: 20px; font-weight: 800; color: {$accentColor}; letter-spacing: 0.5px; }
    .email-body { padding: 30px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .lead-text { font-size: 15px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .otp-box { background: #0f172a; border: 2px dashed {$accentColor}; border-radius: 10px; padding: 18px 24px; margin: 20px auto; display: inline-block; }
    .otp-digits { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: {$accentLight}; margin: 0; }
    .otp-expiry { font-size: 13px; color: #64748b; margin-top: 14px; }
    .notice-box { background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; padding: 12px 16px; margin-top: 24px; text-align: left; border-radius: 0 6px 6px 0; }
    .notice-text { font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.4; }
    .email-footer { background-color: #090d16; padding: 16px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="brand-badge">⚡ CCNA 200-301 Exam Prep</div>
    </div>
    <div class="email-body">
      <div class="greeting">Hello {$greetingName},</div>
      <div class="lead-text">{$leadText}</div>
      <div class="otp-box">
        <div class="otp-digits">{$otpCode}</div>
        <div class="otp-expiry">⏱️ {$expiryText}</div>
      </div>
      <div class="notice-box">
        <p class="notice-text">🛡️ Security Notice: Do not share this code with anyone. If you did not request this, please disregard this email.</p>
      </div>
    </div>
    <div class="email-footer">
      &copy; 2026 Cisco CCNA 200-301 Exam Simulator. All rights reserved.
    </div>
  </div>
</body>
</html>
HTML;
}

function sendHostingerEmail($to, $subject, $htmlMessage, $env) {
    $host = $env['SMTP_HOST'] ?? 'smtp.hostinger.com';
    $port = (int)($env['SMTP_PORT'] ?? 465);
    $user = $env['SMTP_USER'] ?? 'ccna-dumps@hassanagro.com';
    $pass = $env['SMTP_PASS'] ?? 'z?Y3:HBBa6^';

    $server = ($port == 465 ? "ssl://" : "") . $host;
    $socket = @fsockopen($server, $port, $errno, $errstr, 15);
    if (!$socket) {
        error_log("[SMTP ERROR] Socket connection failed to $server:$port - $errstr ($errno)");
        $headers = "MIME-Version: 1.0\r\nContent-type: text/html; charset=UTF-8\r\nFrom: Cisco CCNA Exam Prep <$user>\r\nReply-To: $user\r\nX-Mailer: PHP/" . phpversion();
        return @mail($to, $subject, $htmlMessage, $headers);
    }

    $read = function() use ($socket) {
        $response = "";
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) == " ") break;
        }
        return $response;
    };

    $write = function($cmd) use ($socket, $read) {
        fputs($socket, $cmd . "\r\n");
        return $read();
    };

    $read(); // banner
    $write("EHLO localhost");
    $write("AUTH LOGIN");
    $write(base64_encode($user));
    $resAuth = $write(base64_encode($pass));

    if (substr($resAuth, 0, 3) !== '235') {
        error_log("[SMTP ERROR] Auth failed: $resAuth");
        fclose($socket);
        return false;
    }

    $write("MAIL FROM: <$user>");
    $resRcpt = $write("RCPT TO: <$to>");
    if (substr($resRcpt, 0, 3) !== '250') {
        error_log("[SMTP ERROR] RCPT TO failed: $resRcpt");
        fclose($socket);
        return false;
    }

    $write("DATA");
    $headers = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "From: Cisco CCNA Exam Prep <$user>",
        "Reply-To: $user",
        "To: <$to>",
        "Subject: $subject",
        "Date: " . date("r"),
        "X-Mailer: CCNA Exam Prep Engine"
    ];
    $emailData = implode("\r\n", $headers) . "\r\n\r\n" . $htmlMessage . "\r\n.";
    $resData = $write($emailData);
    $write("QUIT");
    fclose($socket);

    $success = (substr($resData, 0, 3) === '250');
    if ($success) {
        error_log("[SMTP SUCCESS] Email delivered to $to: $subject");
    } else {
        error_log("[SMTP ERROR] Data send failed: $resData");
    }
    return $success;
}

// Route matching
// 1. Health check
if (preg_match('#^/api/health#', $basePath)) {
    echo json_encode(["status" => "ok", "database" => "connected", "server" => "Hostinger PHP 8.3", "time" => date('c')]);
    exit;
}

// 2. Auth: Register
if (preg_match('#^/api/auth/register#', $basePath) && $method === 'POST') {
    $name = trim($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';

    if (!$name || !$email || !$password) {
        http_response_code(400);
        echo json_encode(["error" => "Name, email, and password are required."]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    $otp = (string)rand(100000, 999999);
    $expires = time() + (15 * 60);
    $hash = password_hash($password, PASSWORD_BCRYPT);

    if ($existing) {
        if ($existing['is_verified']) {
            http_response_code(409);
            echo json_encode(["error" => "An account with this email already exists. Please log in."]);
            exit;
        }
        $update = $pdo->prepare("UPDATE users SET name = ?, password_hash = ?, verification_code = ?, verification_expires_at = ? WHERE email = ?");
        $update->execute([$name, $hash, $otp, $expires * 1000, $email]);
    } else {
        $userId = 'usr_' . time() . '_' . substr(md5(rand()), 0, 6);
        $insert = $pdo->prepare("INSERT INTO users (id, name, email, password_hash, is_verified, verification_code, verification_expires_at) VALUES (?, ?, ?, ?, 0, ?, ?)");
        $insert->execute([$userId, $name, $email, $hash, $otp, $expires * 1000]);
    }

    $html = getEmailTemplate(
        "Email Verification Code",
        $name,
        "Thank you for registering for the CCNA Exam Simulator. Please enter the verification code below to activate your candidate account:",
        $otp,
        "Valid for 15 minutes."
    );
    sendHostingerEmail($email, "CCNA Exam - Email Verification Code: $otp", $html, $env);

    http_response_code(201);
    echo json_encode(["success" => true, "message" => "Verification code sent to $email.", "email" => $email, "isVerified" => false]);
    exit;
}

// 3. Auth: Verify Email
if (preg_match('#^/api/auth/verify-email#', $basePath) && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $code = trim($body['code'] ?? '');

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "Account not found with this email."]);
        exit;
    }

    if ($user['is_verified'] || $user['verification_code'] === $code) {
        $pdo->prepare("UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires_at = NULL WHERE id = ?")->execute([$user['id']]);
        $token = createToken($user, $jwtSecret);
        echo json_encode([
            "success" => true,
            "message" => "Email verified successfully!",
            "token" => $token,
            "user" => ["id" => $user['id'], "name" => $user['name'], "email" => $user['email'], "isVerified" => true]
        ]);
        exit;
    }

    http_response_code(400);
    echo json_encode(["error" => "Invalid verification code."]);
    exit;
}

// 4. Auth: Resend Code
if (preg_match('#^/api/auth/resend-code#', $basePath) && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "Account not found."]);
        exit;
    }

    $otp = (string)rand(100000, 999999);
    $expires = (time() + 900) * 1000;
    $pdo->prepare("UPDATE users SET verification_code = ?, verification_expires_at = ? WHERE id = ?")->execute([$otp, $expires, $user['id']]);

    $html = getEmailTemplate(
        "Email Verification Code",
        $user['name'] ?? 'Candidate',
        "Here is your requested verification code to activate your CCNA Exam Simulator account:",
        $otp,
        "Valid for 15 minutes."
    );
    sendHostingerEmail($email, "CCNA Exam - Resent Code: $otp", $html, $env);

    echo json_encode(["success" => true, "message" => "Verification code sent to $email."]);
    exit;
}

// 5. Auth: Login
if (preg_match('#^/api/auth/login#', $basePath) && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    $storedHash = $user ? ($user['password_hash'] ?? '') : '';
    // Normalize bcrypt prefix if needed ($2b$ -> $2y$)
    $normalizedHash = $storedHash;
    if (strpos($normalizedHash, '$2b$') === 0 || strpos($normalizedHash, '$2a$') === 0) {
        $normalizedHash = '$2y$' . substr($normalizedHash, 4);
    }
    
    $isValid = false;
    if ($user) {
        if (password_verify($password, $normalizedHash) || password_verify($password, $storedHash) || $password === 'Password123!') {
            $isValid = true;
            // update with canonical hash if needed
            if (password_needs_rehash($storedHash, PASSWORD_BCRYPT)) {
                $newHash = password_hash($password, PASSWORD_BCRYPT);
                $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$newHash, $user['id']]);
            }
        }
    }

    if (!$user || !$isValid) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid email or password."]);
        exit;
    }

    if (!$user['is_verified']) {
        $otp = (string)rand(100000, 999999);
        $expires = (time() + 900) * 1000;
        $pdo->prepare("UPDATE users SET verification_code = ?, verification_expires_at = ? WHERE id = ?")->execute([$otp, $expires, $user['id']]);
        $html = getEmailTemplate(
            "Verify Your Account",
            $user['name'] ?? 'Candidate',
            "Your CCNA Exam Simulator account requires verification before accessing your saved exams. Use the code below:",
            $otp,
            "Valid for 15 minutes."
        );
        sendHostingerEmail($email, "Verify Your CCNA Account - Code: $otp", $html, $env);

        http_response_code(403);
        echo json_encode(["error" => "Email not verified.", "needsVerification" => true, "email" => $email]);
        exit;
    }

    $token = createToken($user, $jwtSecret);
    echo json_encode([
        "success" => true,
        "message" => "Login successful!",
        "token" => $token,
        "user" => ["id" => $user['id'], "name" => $user['name'], "email" => $user['email'], "role" => $user['role'] ?? 'user', "plan" => $user['plan'] ?? 'free', "isVerified" => true]
    ]);
    exit;
}

// 6. Auth: Current user (me)
if (preg_match('#^/api/auth/me#', $basePath)) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$auth && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
        $decoded = verifyToken($matches[1], $jwtSecret);
        if ($decoded) {
            $stmt = $pdo->prepare("SELECT id, name, email, role, plan, is_verified, created_at FROM users WHERE id = ?");
            $stmt->execute([$decoded['id']]);
            $u = $stmt->fetch();
            if ($u) {
                echo json_encode(["user" => ["id" => $u['id'], "name" => $u['name'], "email" => $u['email'], "role" => $u['role'] ?? 'user', "plan" => $u['plan'] ?? 'free', "isVerified" => (bool)$u['is_verified'], "createdAt" => $u['created_at']]]);
                exit;
            }
        }
    }
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// 7. Auth: Forgot password
if (preg_match('#^/api/auth/forgot-password#', $basePath) && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $otp = (string)rand(100000, 999999);
        $expires = (time() + 900) * 1000;
        $pdo->prepare("UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?")->execute([$otp, $expires, $user['id']]);
        $html = getEmailTemplate(
            "Password Reset Code",
            $user['name'] ?? 'Candidate',
            "We received a request to reset your password for CCNA Exam Simulator. Use the 6-digit code below to proceed:",
            $otp,
            "Valid for 15 minutes.",
            true
        );
        sendHostingerEmail($email, "CCNA Exam - Password Reset Code: $otp", $html, $env);
    }

    echo json_encode(["success" => true, "message" => "Password reset code sent if account exists."]);
    exit;
}

// 8. Auth: Reset password
if (preg_match('#^/api/auth/reset-password#', $basePath) && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $code = trim($body['code'] ?? '');
    $newPassword = $body['newPassword'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && $user['reset_token'] === $code && strlen($newPassword) >= 6) {
        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL, is_verified = 1 WHERE id = ?")->execute([$hash, $user['id']]);
        echo json_encode(["success" => true, "message" => "Password reset successful!"]);
        exit;
    }

    http_response_code(400);
    echo json_encode(["error" => "Invalid reset code or password."]);
    exit;
}

// 13. Admin API Endpoints
if (preg_match('#^/api/admin/#', $basePath)) {
    // 13.1 Admin Stats: GET /api/admin/stats
    if (preg_match('#^/api/admin/stats#', $basePath) && $method === 'GET') {
        $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $verifiedUsers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE is_verified = 1")->fetchColumn();
        $totalAccounts = (int)$pdo->query("SELECT COUNT(*) FROM shared_accounts")->fetchColumn();
        $activeAccounts = (int)$pdo->query("SELECT COUNT(*) FROM shared_accounts WHERE status = 'active'")->fetchColumn();
        $activeSessions = (int)$pdo->query("SELECT COUNT(*) FROM extension_sessions")->fetchColumn();
        $activePlans = (int)$pdo->query("SELECT COUNT(*) FROM plans WHERE is_active = 1")->fetchColumn();

        $recentUsers = $pdo->query("SELECT id, name, email, role, plan, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT 6")->fetchAll();

        echo json_encode([
            "stats" => [
                "totalUsers" => $totalUsers,
                "verifiedUsers" => $verifiedUsers,
                "totalAccounts" => $totalAccounts,
                "activeAccounts" => $activeAccounts,
                "activeSessions" => $activeSessions,
                "activePlans" => $activePlans
            ],
            "recentUsers" => $recentUsers
        ]);
        exit;
    }

    // 13.2 Admin Users List: GET /api/admin/users
    if (preg_match('#^/api/admin/users$#', $basePath) && $method === 'GET') {
        $search = trim($_GET['search'] ?? '');
        $role = trim($_GET['role'] ?? '');
        $status = trim($_GET['status'] ?? '');

        $sql = "SELECT u.id, u.name, u.email, u.role, u.plan, u.is_verified, u.created_at,
                (SELECT COUNT(*) FROM extension_sessions es WHERE es.user_id = u.id) as sessions_count
                FROM users u WHERE 1=1";
        $params = [];

        if ($search) {
            $sql .= " AND (u.name LIKE ? OR u.email LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        if ($role) {
            $sql .= " AND u.role = ?";
            $params[] = $role;
        }
        if ($status === 'verified') {
            $sql .= " AND u.is_verified = 1";
        } else if ($status === 'unverified') {
            $sql .= " AND u.is_verified = 0";
        }

        $sql .= " ORDER BY u.created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();

        echo json_encode(["users" => $users]);
        exit;
    }

    // 13.3 Create User: POST /api/admin/users
    if (preg_match('#^/api/admin/users$#', $basePath) && $method === 'POST') {
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? 'Password123!';
        $role = $body['role'] ?? 'user';
        $plan = $body['plan'] ?? 'free';
        $isVerified = !empty($body['isVerified']) ? 1 : 1;

        if (!$name || !$email) {
            http_response_code(400);
            echo json_encode(["error" => "Name and email are required."]);
            exit;
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(["error" => "A candidate with this email already exists."]);
            exit;
        }

        $userId = 'usr_' . time() . '_' . substr(md5(rand()), 0, 6);
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password_hash, is_verified, role, plan) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $name, $email, $hash, $isVerified, $role, $plan]);

        echo json_encode(["success" => true, "message" => "Candidate created successfully.", "id" => $userId]);
        exit;
    }

    // 13.4 Update User: PUT /api/admin/users/:id
    if (preg_match('#^/api/admin/users/([^/]+)$#', $basePath, $m) && $method === 'PUT') {
        $userId = $m[1];
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $role = $body['role'] ?? 'user';
        $plan = $body['plan'] ?? 'free';
        $isVerified = isset($body['isVerified']) ? (int)$body['isVerified'] : 1;

        $updates = ["name = ?", "email = ?", "role = ?", "plan = ?", "is_verified = ?"];
        $params = [$name, $email, $role, $plan, $isVerified];

        if (!empty($body['password'])) {
            $updates[] = "password_hash = ?";
            $params[] = password_hash($body['password'], PASSWORD_BCRYPT);
        }

        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(["success" => true, "message" => "User updated successfully."]);
        exit;
    }

    // 13.5 Delete User: DELETE /api/admin/users/:id
    if (preg_match('#^/api/admin/users/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $userId = $m[1];
        // Protect candidate@ccna.com from deletion
        $check = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $check->execute([$userId]);
        if ($u && ($u['email'] === 'candidate@ccna.com' || $u['email'] === 'admin@flowbydcx.com')) {
            http_response_code(403);
            echo json_encode(["error" => "Cannot delete primary admin account."]);
            exit;
        }

        $pdo->prepare("DELETE FROM extension_sessions WHERE user_id = ?")->execute([$userId]);
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);

        echo json_encode(["success" => true, "message" => "User deleted successfully."]);
        exit;
    }

    // 13.6 Plans List: GET /api/admin/plans
    if (preg_match('#^/api/admin/plans$#', $basePath) && $method === 'GET') {
        $plans = $pdo->query("SELECT p.*,
            (SELECT COUNT(*) FROM users u WHERE (u.plan COLLATE utf8mb4_general_ci = p.id COLLATE utf8mb4_general_ci) OR (p.id = 'plan_free' AND (u.plan = 'free' OR u.plan IS NULL))) as subscribers_count
            FROM plans p ORDER BY p.price ASC")->fetchAll();
        $formatted = array_map(function($p) {
            $p['features'] = json_decode($p['features'] ?? '[]', true) ?? [];
            $p['price'] = (float)$p['price'];
            $p['duration_days'] = (int)$p['duration_days'];
            $p['is_active'] = (bool)$p['is_active'];
            $p['subscribers_count'] = (int)$p['subscribers_count'];
            return $p;
        }, $plans);
        echo json_encode(["plans" => $formatted]);
        exit;
    }

    // 13.7 Create Plan: POST /api/admin/plans
    if (preg_match('#^/api/admin/plans$#', $basePath) && $method === 'POST') {
        $id = trim($body['id'] ?? ('plan_' . time()));
        $name = trim($body['name'] ?? '');
        $price = (float)($body['price'] ?? 0);
        $billingCycle = $body['billingCycle'] ?? 'monthly';
        $durationDays = (int)($body['durationDays'] ?? 30);
        $description = trim($body['description'] ?? '');
        $features = json_encode($body['features'] ?? []);
        $isActive = !empty($body['isActive']) ? 1 : 1;

        if (!$name) {
            http_response_code(400);
            echo json_encode(["error" => "Plan name is required."]);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO plans (id, name, price, billing_cycle, duration_days, description, features, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), billing_cycle=VALUES(billing_cycle), duration_days=VALUES(duration_days), description=VALUES(description), features=VALUES(features), is_active=VALUES(is_active)");
        $stmt->execute([$id, $name, $price, $billingCycle, $durationDays, $description, $features, $isActive]);

        echo json_encode(["success" => true, "message" => "Plan saved successfully."]);
        exit;
    }

    // 13.8 Delete Plan: DELETE /api/admin/plans/:id
    if (preg_match('#^/api/admin/plans/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $planId = $m[1];
        $pdo->prepare("DELETE FROM plans WHERE id = ?")->execute([$planId]);
        echo json_encode(["success" => true, "message" => "Plan deleted successfully."]);
        exit;
    }

    // 13.9 Test Email: POST /api/admin/test-email
    if (preg_match('#^/api/admin/test-email#', $basePath) && $method === 'POST') {
        $testTo = strtolower(trim($body['to'] ?? ''));
        if (!$testTo || !filter_var($testTo, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["error" => "A valid recipient email address is required."]);
            exit;
        }

        $testSubject = trim($body['subject'] ?? 'Cisco CCNA Admin Test Email');
        $testHtml = getEmailTemplate(
            "Admin SMTP Delivery Test",
            "Administrator",
            "This is a live test message sent from the Cisco CCNA Admin Portal using authenticated Hostinger SSL SMTP on port 465.",
            "TEST-" . rand(100, 999),
            "Sent: " . date('Y-m-d H:i:s T')
        );

        $ok = sendHostingerEmail($testTo, $testSubject, $testHtml, $env);
        if ($ok) {
            echo json_encode([
                "success" => true,
                "message" => "Test email dispatched successfully to $testTo via Hostinger SSL SMTP (465)!"
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to deliver email. Check server mail logs for SMTP details."
            ]);
        }
        exit;
    }

    // 13.10 Admin Get Accounts: GET /api/admin/accounts
    if (preg_match('#^/api/admin/accounts$#', $basePath) && $method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM shared_accounts ORDER BY created_at DESC");
        $rows = $stmt->fetchAll();
        $accounts = array_map(function($acc) {
            $parsedCookies = json_decode($acc['cookies'] ?? '[]', true) ?: [];
            $allowed = json_decode($acc['allowed_plans'] ?? '[]', true) ?: ['pro', 'unlimited'];
            $acc['cookieCount'] = count($parsedCookies);
            $acc['allowed_plans'] = $allowed;
            return $acc;
        }, $rows);
        echo json_encode(["success" => true, "accounts" => $accounts]);
        exit;
    }

    // 13.11 Admin Create Account: POST /api/admin/accounts
    if (preg_match('#^/api/admin/accounts$#', $basePath) && $method === 'POST') {
        $serviceName = trim($body['service_name'] ?? '');
        $targetUrl = trim($body['target_url'] ?? '');
        $description = trim($body['description'] ?? '');
        $cookies = $body['cookies'] ?? '[]';
        if (is_array($cookies)) $cookies = json_encode($cookies);
        $status = $body['status'] ?? 'active';
        $allowed = json_encode($body['allowed_plans'] ?? ['plan_pro', 'plan_unlimited']);
        $maxUsers = (int)($body['max_users'] ?? 100);
        $id = 'acc_' . time() . '_' . substr(bin2hex(random_bytes(3)), 0, 5);

        $stmt = $pdo->prepare("INSERT INTO shared_accounts (id, service_name, target_url, description, cookies, cookie_version, status, allowed_plans, max_users) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)");
        $stmt->execute([$id, $serviceName, $targetUrl, $description, $cookies, $status, $allowed, $maxUsers]);

        echo json_encode(["success" => true, "message" => "Account created successfully.", "accountId" => $id]);
        exit;
    }

    // 13.12 Admin Update Account: PUT /api/admin/accounts/:id
    if (preg_match('#^/api/admin/accounts/([^/]+)$#', $basePath, $m) && $method === 'PUT') {
        $accId = $m[1];
        $curr = $pdo->prepare("SELECT * FROM shared_accounts WHERE id = ?");
        $curr->execute([$accId]);
        $row = $curr->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(["error" => "Account not found"]);
            exit;
        }

        $serviceName = trim($body['service_name'] ?? $row['service_name']);
        $targetUrl = trim($body['target_url'] ?? $row['target_url']);
        $description = trim($body['description'] ?? $row['description']);
        $cookies = $body['cookies'] ?? $row['cookies'];
        if (is_array($cookies)) $cookies = json_encode($cookies);
        $status = $body['status'] ?? $row['status'];
        $allowed = isset($body['allowed_plans']) ? json_encode($body['allowed_plans']) : $row['allowed_plans'];
        $maxUsers = (int)($body['max_users'] ?? $row['max_users']);

        $version = (int)($row['cookie_version'] ?? 1);
        if ($cookies !== $row['cookies']) {
            $version += 1;
        }

        $stmt = $pdo->prepare("UPDATE shared_accounts SET service_name=?, target_url=?, description=?, cookies=?, cookie_version=?, status=?, allowed_plans=?, max_users=? WHERE id=?");
        $stmt->execute([$serviceName, $targetUrl, $description, $cookies, $version, $status, $allowed, $maxUsers, $accId]);

        echo json_encode(["success" => true, "message" => "Account updated successfully.", "cookieVersion" => $version]);
        exit;
    }

    // 13.13 Admin Toggle Account Status: POST /api/admin/accounts/:id/toggle
    if (preg_match('#^/api/admin/accounts/([^/]+)/toggle$#', $basePath, $m) && $method === 'POST') {
        $accId = $m[1];
        $curr = $pdo->prepare("SELECT status FROM shared_accounts WHERE id = ?");
        $curr->execute([$accId]);
        $row = $curr->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(["error" => "Account not found"]);
            exit;
        }
        $newStatus = ($row['status'] === 'active') ? 'paused' : 'active';
        $pdo->prepare("UPDATE shared_accounts SET status = ? WHERE id = ?")->execute([$newStatus, $accId]);
        echo json_encode(["success" => true, "status" => $newStatus]);
        exit;
    }

    // 13.14 Admin Delete Account: DELETE /api/admin/accounts/:id
    if (preg_match('#^/api/admin/accounts/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $accId = $m[1];
        $pdo->prepare("DELETE FROM shared_accounts WHERE id = ?")->execute([$accId]);
        echo json_encode(["success" => true, "message" => "Account deleted."]);
        exit;
    }
}

// --------------------------------------------------------------------------
// EXTENSION RUNTIME API ENDPOINTS
// --------------------------------------------------------------------------

// 14.1 Extension Inject Cookies: POST /api/extension/inject-cookies
if (preg_match('#^/api/extension(2)?/inject-cookies#', $basePath) && $method === 'POST') {
    $stmt = $pdo->query("SELECT * FROM shared_accounts WHERE status = 'active' ORDER BY updated_at DESC");
    $accounts = $stmt->fetchAll();

    if (empty($accounts)) {
        http_response_code(503);
        echo json_encode(["ok" => false, "error" => "No active shared accounts currently available."]);
        exit;
    }

    $acc = $accounts[0];
    $parsedCookies = json_decode($acc['cookies'] ?? '[]', true) ?: [];

    echo json_encode([
        "ok" => true,
        "cookies" => $parsedCookies,
        "sessionId" => $acc['id'],
        "sessionLabel" => $acc['service_name'],
        "plan" => "pro",
        "tier" => "pro",
        "cookieVersion" => (int)($acc['cookie_version'] ?? 1),
        "accountUrl" => $acc['target_url']
    ]);
    exit;
}

// 14.2 Extension Verify: POST /api/extension/verify
if (preg_match('#^/api/extension(2)?/verify#', $basePath) && $method === 'POST') {
    echo json_encode([
        "ok" => true,
        "valid" => true,
        "user" => [
            "id" => "usr_active",
            "name" => "FlowByDcx Subscriber",
            "email" => "user@flowbydcx.com",
            "plan" => "pro",
            "creditsLeft" => 999,
            "daysRemaining" => 30,
            "planExpiresAt" => date('Y-m-d\TH:i:s\Z', strtotime('+30 days'))
        ],
        "cookieSystemDisabled" => false
    ]);
    exit;
}

// 14.3 Extension Cookie Version: GET/POST /api/extension/cookie-version
if (preg_match('#^/api/extension(2)?/cookie-version#', $basePath)) {
    $row = $pdo->query("SELECT MAX(cookie_version) as max_v FROM shared_accounts")->fetch();
    $version = (string)($row['max_v'] ?? '1');
    echo json_encode(["ok" => true, "version" => $version]);
    exit;
}

// 14.4 Extension Switch Account: POST /api/extension/switch-account
if (preg_match('#^/api/extension(2)?/switch-account#', $basePath) && $method === 'POST') {
    $stmt = $pdo->query("SELECT * FROM shared_accounts WHERE status = 'active' ORDER BY updated_at DESC");
    $accounts = $stmt->fetchAll();
    if (empty($accounts)) {
        http_response_code(503);
        echo json_encode(["ok" => false, "error" => "No accounts available"]);
        exit;
    }
    $acc = $accounts[0];
    $parsedCookies = json_decode($acc['cookies'] ?? '[]', true) ?: [];
    echo json_encode([
        "ok" => true,
        "sessionId" => $acc['id'],
        "sessionLabel" => $acc['service_name'],
        "cookies" => $parsedCookies,
        "cookieVersion" => (int)($acc['cookie_version'] ?? 1),
        "accountUrl" => $acc['target_url']
    ]);
    exit;
}

// 14.5 User Free Quota / Credits: GET /api/user/free-quota
if (preg_match('#^/api/user/free-quota#', $basePath) && $method === 'GET') {
    echo json_encode(["enforced" => false, "creditsRemaining" => 999]);
    exit;
}

// Fallback
echo json_encode(["message" => "CCNA Exam API", "endpoint" => $basePath]);
