<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

// Strict domain lock: Build & API are strictly mapped to toolsbydcx.com
$httpHost = strtolower($_SERVER['HTTP_HOST'] ?? '');
$cleanHost = explode(':', $httpHost)[0];
$allowedHosts = ['toolsbydcx.com', 'www.toolsbydcx.com', 'localhost', '127.0.0.1'];
if (!in_array($cleanHost, $allowedHosts)) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "error" => "License violation: This platform is strictly authorized to operate exclusively on toolsbydcx.com."
    ]);
    exit;
}

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

// Database credentials mapped with server details
$dbHost = $env['DB_HOST'] ?? 'localhost';
$dbUser = $env['DB_USER'] ?? 'u390461415_toolsbydcx';
$dbPass = $env['DB_PASSWORD'] ?? '0TN&pstO/x';
$dbName = $env['DB_NAME'] ?? 'u390461415_toolsbydcx';
$jwtSecret = $env['JWT_SECRET'] ?? 'toolsbydcx_production_secret_key_2026';

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
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

// Helper: JWT creation
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
    return "$header.$payload." . base64_encode($sig);
}

// Helper: JWT verification
function verifyToken($token, $secret) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    list($header, $payload, $sig) = $parts;
    $validSig = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    if ($sig !== $validSig) return false;
    $data = json_decode(base64_decode($payload), true);
    if (!$data || !isset($data['id'])) return false;
    if (isset($data['exp']) && $data['exp'] < time()) return false;
    return $data;
}

// Helper: Get authenticated user from Bearer header or token
function getAuthUser($pdo, $secret, $explicitToken = null) {
    $token = $explicitToken;
    if (!$token) {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $m)) {
            $token = $m[1];
        }
    }
    if ($token) {
        $verified = verifyToken($token, $secret);
        if ($verified && isset($verified['id'])) {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$verified['id']]);
            $u = $stmt->fetch();
            if ($u) {
                return $u;
            }
        }
    }
    return null;
}

// Helper: Calculate next semver version (patch bump)
function getNextSemverPhp($currentVer) {
    if (!$currentVer) return '1.0.0';
    $clean = trim(ltrim($currentVer, 'vV'));
    $parts = explode('.', $clean);
    if (count($parts) >= 3 && is_numeric($parts[2])) {
        $parts[2] = (string)((int)$parts[2] + 1);
        return implode('.', array_slice($parts, 0, 3));
    } else if (count($parts) == 2 && is_numeric($parts[1])) {
        return $parts[0] . '.' . ((int)$parts[1] + 1) . '.0';
    }
    return $clean . '.1';
}

// Helper: Email template
function getEmailTemplate($title, $greetingName, $leadText, $otpCode, $expiryText = "Valid for 15 minutes.", $isWarning = false) {
    $accentColor = $isWarning ? "#ef4444" : "#3b82f6";
    $accentLight = $isWarning ? "#f87171" : "#60a5fa";
    return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{$title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #f8fafc; }
    .email-container { max-width: 540px; margin: 0 auto; background-color: #111827; border-radius: 12px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .email-header { background: #080c14; padding: 24px 30px; border-bottom: 1px solid #1f2937; text-align: center; }
    .brand-badge { font-size: 20px; font-weight: 800; color: {$accentColor}; letter-spacing: 0.5px; }
    .email-body { padding: 30px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .lead-text { font-size: 15px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .otp-box { background: #0b0f19; border: 2px dashed {$accentColor}; border-radius: 10px; padding: 18px 24px; margin: 20px auto; display: inline-block; }
    .otp-digits { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: {$accentLight}; margin: 0; }
    .otp-expiry { font-size: 13px; color: #64748b; margin-top: 14px; }
    .notice-box { background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; padding: 12px 16px; margin-top: 24px; text-align: left; border-radius: 0 6px 6px 0; }
    .notice-text { font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.4; }
    .email-footer { background-color: #080c14; padding: 16px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1f2937; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="brand-badge">⚡ ToolsByDcx Platform</div>
    </div>
    <div class="email-body">
      <div class="greeting">Hello {$greetingName},</div>
      <div class="lead-text">{$leadText}</div>
      <div class="otp-box">
        <div class="otp-digits">{$otpCode}</div>
        <div class="otp-expiry">⏱️ {$expiryText}</div>
      </div>
      <div class="notice-box">
        <p class="notice-text">🛡️ Security Notice: Never share this code with anyone. If you did not request this, please disregard this email.</p>
      </div>
    </div>
    <div class="email-footer">
      &copy; 2026 ToolsByDcx. All rights reserved.
    </div>
  </div>
</body>
</html>
HTML;
}

// Helper: Hostinger SMTP sender
function sendHostingerEmail($to, $subject, $htmlMessage, $env) {
    $host = $env['SMTP_HOST'] ?? 'smtp.hostinger.com';
    $port = (int)($env['SMTP_PORT'] ?? 465);
    $user = $env['SMTP_USER'] ?? 'ccna-dumps@hassanagro.com';
    $pass = $env['SMTP_PASS'] ?? 'z?Y3:HBBa6^';

    $server = ($port == 465 ? "ssl://" : "") . $host;
    $socket = @fsockopen($server, $port, $errno, $errstr, 15);
    if (!$socket) {
        $headers = "MIME-Version: 1.0\r\nContent-type: text/html; charset=UTF-8\r\nFrom: ToolsByDcx <$user>\r\nReply-To: $user\r\nX-Mailer: PHP/" . phpversion();
        return @mail($to, $subject, $htmlMessage, $headers);
    }

    $read = function() use ($socket) {
        $res = "";
        while ($line = fgets($socket, 515)) {
            $res .= $line;
            if (substr($line, 3, 1) == " ") break;
        }
        return $res;
    };
    $write = function($cmd) use ($socket, $read) {
        fputs($socket, $cmd . "\r\n");
        return $read();
    };

    $read();
    $write("EHLO localhost");
    $write("AUTH LOGIN");
    $write(base64_encode($user));
    $resAuth = $write(base64_encode($pass));
    if (substr($resAuth, 0, 3) !== '235') {
        fclose($socket);
        return false;
    }
    $write("MAIL FROM: <$user>");
    $resRcpt = $write("RCPT TO: <$to>");
    if (substr($resRcpt, 0, 3) !== '250') {
        fclose($socket);
        return false;
    }
    $write("DATA");
    $headers = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "From: ToolsByDcx <$user>",
        "Reply-To: $user",
        "To: <$to>",
        "Subject: $subject",
        "Date: " . date("r"),
        "X-Mailer: ToolsByDcx Mailer"
    ];
    $emailData = implode("\r\n", $headers) . "\r\n\r\n" . $htmlMessage . "\r\n.";
    $resData = $write($emailData);
    $write("QUIT");
    fclose($socket);
    return (substr($resData, 0, 3) === '250');
}

// --------------------------------------------------------------------------
// 1. HEALTH CHECK: GET /api/health
// --------------------------------------------------------------------------
if (preg_match('#^/api/health#', $basePath)) {
    echo json_encode(["status" => "ok", "platform" => "ToolsByDcx", "domain" => "toolsbydcx.com", "time" => date('c')]);
    exit;
}

// --------------------------------------------------------------------------
// 2. PUBLIC PLANS: GET /api/plans
// --------------------------------------------------------------------------
if (preg_match('#^/api/plans$#', $basePath) && $method === 'GET') {
    $plans = $pdo->query("SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC")->fetchAll();
    $formatted = array_map(function($p) {
        $p['features'] = json_decode($p['features'] ?? '[]', true) ?: [];
        $p['price'] = (float)$p['price'];
        $p['duration_days'] = (int)$p['duration_days'];
        $p['credits'] = isset($p['credits']) ? (int)$p['credits'] : 100;
        return $p;
    }, $plans);
    echo json_encode(["success" => true, "plans" => $formatted]);
    exit;
}

// --------------------------------------------------------------------------
// 3. AUTH: REGISTER (STRICTLY DISABLED)
// --------------------------------------------------------------------------
if (preg_match('#^/api/auth/register#', $basePath) && $method === 'POST') {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "error" => "Public registration is disabled. Accounts can only be created by an administrator or an authorized reseller partner.",
        "message" => "Public registration is disabled. Accounts can only be created by an administrator or an authorized reseller partner."
    ]);
    exit;
}

// --------------------------------------------------------------------------
// 4. AUTH: LOGIN: POST /api/auth/login
// --------------------------------------------------------------------------
if (preg_match('#^/api/auth/login#', $basePath) && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(["error" => "Email and password are required."]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    $passValid = false;
    if ($user && !empty($user['password_hash'])) {
        if (password_verify($password, $user['password_hash']) || password_verify(trim($password), $user['password_hash'])) {
            $passValid = true;
        }
    }

    if (!$user || !$passValid) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid email or password."]);
        exit;
    }

    if (!empty($user['is_banned'])) {
        http_response_code(403);
        echo json_encode(["error" => "Your account has been suspended. Please contact your administrator."]);
        exit;
    }

    $token = createToken($user, $jwtSecret);
    echo json_encode([
        "success" => true,
        "token" => $token,
        "user" => [
            "id" => $user['id'],
            "name" => $user['name'],
            "email" => $user['email'],
            "role" => $user['role'] ?? 'user',
            "plan" => $user['plan'] ?? 'free',
            "isVerified" => (bool)$user['is_verified'],
            "credits" => (int)($user['credits'] ?? 100)
        ]
    ]);
    exit;
}

// --------------------------------------------------------------------------
// 5. AUTH: ME: GET /api/auth/me
// --------------------------------------------------------------------------
if (preg_match('#^/api/auth/me#', $basePath) && $method === 'GET') {
    $user = getAuthUser($pdo, $jwtSecret);
    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit;
    }
    echo json_encode([
        "user" => [
            "id" => $user['id'],
            "name" => $user['name'],
            "email" => $user['email'],
            "role" => $user['role'] ?? 'user',
            "plan" => $user['plan'] ?? 'free',
            "isVerified" => (bool)$user['is_verified'],
            "credits" => (int)($user['credits'] ?? 100),
            "max_customers" => (int)($user['max_customers'] ?? 10),
            "expires_at" => $user['expires_at']
        ]
    ]);
    exit;
}

// --------------------------------------------------------------------------
// 6. AUTH: FORGOT PASSWORD: POST /api/auth/forgot-password
// --------------------------------------------------------------------------
if (preg_match('#^/api/auth/forgot-password#', $basePath) && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    if (!$email) {
        http_response_code(400);
        echo json_encode(["error" => "Email is required."]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $code = (string)rand(100000, 999999);
        $expires = time() + (15 * 60);
        $pdo->prepare("UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?")->execute([$code, $expires * 1000, $user['id']]);

        $html = getEmailTemplate("Password Reset Code", $user['name'], "We received a request to reset your ToolsByDcx password. Enter the code below to proceed:", $code, "Valid for 15 minutes.");
        sendHostingerEmail($email, "ToolsByDcx - Password Reset Code: $code", $html, $env);
    }

    echo json_encode(["success" => true, "message" => "If an account exists, a reset code was sent."]);
    exit;
}

// --------------------------------------------------------------------------
// 7. AUTH: RESET PASSWORD: POST /api/auth/reset-password
// --------------------------------------------------------------------------
if (preg_match('#^/api/auth/reset-password#', $basePath) && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $code = trim($body['code'] ?? '');
    $newPassword = $body['password'] ?? ($body['newPassword'] ?? '');

    if (!$email || !$code || !$newPassword) {
        http_response_code(400);
        echo json_encode(["error" => "Email, code, and new password are required."]);
        exit;
    }

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
    echo json_encode(["error" => "Invalid or expired reset code."]);
    exit;
}

// --------------------------------------------------------------------------
// 8. ADMIN ROUTES: /api/admin/*
// --------------------------------------------------------------------------
if (preg_match('#^/api/admin/#', $basePath)) {
    $admin = getAuthUser($pdo, $jwtSecret);
    if (!$admin || ($admin['role'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(["error" => "Admin access required."]);
        exit;
    }

    // 8.1 Stats: GET /api/admin/stats
    if (preg_match('#^/api/admin/stats#', $basePath) && $method === 'GET') {
        $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $totalResellers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'reseller'")->fetchColumn();
        $totalCustomers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn();
        $activeSessions = (int)$pdo->query("SELECT COUNT(*) FROM extension_sessions")->fetchColumn();
        $totalAccounts = (int)$pdo->query("SELECT COUNT(*) FROM shared_accounts")->fetchColumn();
        $activeAccounts = (int)$pdo->query("SELECT COUNT(*) FROM shared_accounts WHERE status = 'active'")->fetchColumn();

        $recentUsers = $pdo->query("SELECT id, name, email, role, plan, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT 6")->fetchAll();

        echo json_encode([
            "success" => true,
            "stats" => [
                "totalUsers" => $totalUsers,
                "totalResellers" => $totalResellers,
                "totalCustomers" => $totalCustomers,
                "activeSessions" => $activeSessions,
                "totalAccounts" => $totalAccounts,
                "activeAccounts" => $activeAccounts
            ],
            "recentUsers" => $recentUsers
        ]);
        exit;
    }

    // 8.2 Users List: GET /api/admin/users
    if (preg_match('#^/api/admin/users$#', $basePath) && $method === 'GET') {
        $search = trim($_GET['search'] ?? '');
        $role = trim($_GET['role'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $resellerId = trim($_GET['reseller_id'] ?? '');

        $sql = "SELECT u.id, u.name, u.email, u.role, u.plan, u.credits, u.expires_at, u.is_verified, u.max_customers, u.created_at,
                (SELECT COUNT(*) FROM users sub WHERE sub.reseller_id = u.id) as sub_users_count,
                p.duration_days, p.billing_cycle, p.name as plan_name
                FROM users u
                LEFT JOIN plans p ON (u.plan = p.id OR p.id = CONCAT('plan_', u.plan))
                WHERE 1=1";
        $params = [];
        if ($search) {
            $sql .= " AND (u.name LIKE ? OR u.email LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        if ($resellerId) {
            $sql .= " AND u.reseller_id = ?";
            $params[] = $resellerId;
        } else if ($role) {
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

        $annotated = array_map(function($u) {
            $planDuration = (int)($u['duration_days'] ?? 30);
            $createdAt = strtotime($u['created_at'] ?? 'now');
            $elapsedDays = floor((time() - $createdAt) / 86400);
            $daysRemaining = max(0, $planDuration - max(0, $elapsedDays));
            return array_merge($u, [
                "credits" => (int)($u['credits'] ?? 100),
                "sub_users_count" => (int)($u['sub_users_count'] ?? 0),
                "daysRemaining" => $daysRemaining,
                "isExpired" => $daysRemaining <= 0
            ]);
        }, $users);

        echo json_encode(["users" => $annotated]);
        exit;
    }

    // 8.3 Resellers List: GET /api/admin/resellers
    if (preg_match('#^/api/admin/resellers$#', $basePath) && $method === 'GET') {
        $stmt = $pdo->query("SELECT u.id, u.name, u.email, u.role, u.plan, u.credits, u.expires_at, u.is_verified, u.max_customers, u.created_at,
            (SELECT COUNT(*) FROM users sub WHERE sub.reseller_id = u.id) as sub_users_count
            FROM users u WHERE u.role = 'reseller' ORDER BY u.created_at DESC");
        $resellers = $stmt->fetchAll();
        echo json_encode(["success" => true, "resellers" => $resellers]);
        exit;
    }

    // 8.4 Create Reseller: POST /api/admin/resellers
    if (preg_match('#^/api/admin/resellers$#', $basePath) && $method === 'POST') {
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? 'Password123!';
        $plan = $body['plan'] ?? 'plan_pro';
        $maxCustomers = (int)($body['maxCustomers'] ?? ($body['max_customers'] ?? 10));

        if (!$name || !$email) {
            http_response_code(400);
            echo json_encode(["error" => "Name and email are required."]);
            exit;
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(["error" => "Account already exists."]);
            exit;
        }

        $resellerId = 'res_' . time() . '_' . substr(md5(rand()), 0, 5);
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password_hash, is_verified, role, plan, max_customers) VALUES (?, ?, ?, ?, 1, 'reseller', ?, ?)");
        $stmt->execute([$resellerId, $name, $email, $hash, $plan, $maxCustomers]);

        echo json_encode(["success" => true, "message" => "Reseller created.", "id" => $resellerId]);
        exit;
    }

    // 8.5 Update Reseller: PUT /api/admin/resellers/:id
    if (preg_match('#^/api/admin/resellers/([^/]+)$#', $basePath, $m) && $method === 'PUT') {
        $resellerId = $m[1];
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $maxCustomers = (int)($body['maxCustomers'] ?? ($body['max_customers'] ?? 10));

        $pdo->prepare("UPDATE users SET name = ?, email = ?, max_customers = ? WHERE id = ? AND role = 'reseller'")->execute([$name, $email, $maxCustomers, $resellerId]);
        if (!empty($body['password'])) {
            $hash = password_hash($body['password'], PASSWORD_BCRYPT);
            $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $resellerId]);
        }
        echo json_encode(["success" => true, "message" => "Reseller updated."]);
        exit;
    }

    // 8.6 Delete Reseller: DELETE /api/admin/resellers/:id
    if (preg_match('#^/api/admin/resellers/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $resellerId = $m[1];
        $pdo->prepare("UPDATE users SET reseller_id = NULL WHERE reseller_id = ?")->execute([$resellerId]);
        $pdo->prepare("DELETE FROM users WHERE id = ? AND role = 'reseller'")->execute([$resellerId]);
        echo json_encode(["success" => true, "message" => "Reseller deleted."]);
        exit;
    }

    // 8.7 Create User: POST /api/admin/users
    if (preg_match('#^/api/admin/users$#', $basePath) && $method === 'POST') {
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? 'Password123!';
        $role = $body['role'] ?? 'user';
        $plan = $body['plan'] ?? 'free';
        $credits = (int)($body['credits'] ?? 100);

        if (!$name || !$email) {
            http_response_code(400);
            echo json_encode(["error" => "Name and email are required."]);
            exit;
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(["error" => "User already exists with this email."]);
            exit;
        }

        $userId = 'usr_' . time() . '_' . substr(md5(rand()), 0, 6);
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password_hash, is_verified, role, plan, credits) VALUES (?, ?, ?, ?, 1, ?, ?, ?)");
        $stmt->execute([$userId, $name, $email, $hash, $role, $plan, $credits]);

        echo json_encode(["success" => true, "message" => "User created.", "id" => $userId]);
        exit;
    }

    // 8.8 Update User: PUT /api/admin/users/:id
    if (preg_match('#^/api/admin/users/([^/]+)$#', $basePath, $m) && $method === 'PUT') {
        $userId = $m[1];
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $role = $body['role'] ?? 'user';
        $plan = $body['plan'] ?? 'free';
        $credits = isset($body['credits']) ? (int)$body['credits'] : 100;

        $pdo->prepare("UPDATE users SET name = ?, email = ?, role = ?, plan = ?, credits = ? WHERE id = ?")->execute([$name, $email, $role, $plan, $credits, $userId]);
        if (!empty($body['password'])) {
            $hash = password_hash($body['password'], PASSWORD_BCRYPT);
            $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $userId]);
        }
        echo json_encode(["success" => true, "message" => "User updated successfully."]);
        exit;
    }

    // 8.9 Delete User: DELETE /api/admin/users/:id
    if (preg_match('#^/api/admin/users/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $userId = $m[1];
        $check = $pdo->prepare("SELECT email FROM users WHERE id = ?");
        $check->execute([$userId]);
        $u = $check->fetch();
        if ($u && ($u['email'] === 'admin@flowbydcx.com' || $u['email'] === 'admin@system.com')) {
            http_response_code(403);
            echo json_encode(["error" => "Primary admin account cannot be deleted."]);
            exit;
        }

        $pdo->prepare("DELETE FROM extension_sessions WHERE user_id = ?")->execute([$userId]);
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
        echo json_encode(["success" => true, "message" => "User deleted."]);
        exit;
    }

    // 8.10 Admin Plans: GET /api/admin/plans
    if (preg_match('#^/api/admin/plans$#', $basePath) && $method === 'GET') {
        $plans = $pdo->query("SELECT * FROM plans ORDER BY price ASC")->fetchAll();
        $formatted = array_map(function($p) {
            $p['features'] = json_decode($p['features'] ?? '[]', true) ?: [];
            $p['price'] = (float)$p['price'];
            $p['duration_days'] = (int)$p['duration_days'];
            $p['credits'] = isset($p['credits']) ? (int)$p['credits'] : 100;
            return $p;
        }, $plans);
        echo json_encode(["plans" => $formatted]);
        exit;
    }

    // 8.11 Create / Update Plan: POST /api/admin/plans
    if (preg_match('#^/api/admin/plans$#', $basePath) && $method === 'POST') {
        $id = trim($body['id'] ?? ('plan_' . time()));
        $name = trim($body['name'] ?? '');
        $price = (float)($body['price'] ?? 0);
        $billingCycle = $body['billingCycle'] ?? 'monthly';
        $durationDays = (int)($body['durationDays'] ?? 30);
        $credits = isset($body['credits']) ? (int)$body['credits'] : 100;
        $description = trim($body['description'] ?? '');
        $features = json_encode($body['features'] ?? []);
        $isActive = !empty($body['isActive']) ? 1 : 1;

        $stmt = $pdo->prepare("INSERT INTO plans (id, name, price, billing_cycle, duration_days, credits, description, features, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), billing_cycle=VALUES(billing_cycle), duration_days=VALUES(duration_days), credits=VALUES(credits), description=VALUES(description), features=VALUES(features), is_active=VALUES(is_active)");
        $stmt->execute([$id, $name, $price, $billingCycle, $durationDays, $credits, $description, $features, $isActive]);

        echo json_encode(["success" => true, "message" => "Plan saved successfully."]);
        exit;
    }

    // 8.12 Delete Plan: DELETE /api/admin/plans/:id
    if (preg_match('#^/api/admin/plans/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $pdo->prepare("DELETE FROM plans WHERE id = ?")->execute([$m[1]]);
        echo json_encode(["success" => true, "message" => "Plan deleted."]);
        exit;
    }

    // 8.13 Shared Accounts: GET /api/admin/accounts
    if (preg_match('#^/api/admin/accounts$#', $basePath) && $method === 'GET') {
        $accounts = $pdo->query("SELECT * FROM shared_accounts ORDER BY created_at DESC")->fetchAll();
        $formatted = array_map(function($acc) {
            $parsedCookies = json_decode($acc['cookies'] ?? '[]', true) ?: [];
            $acc['cookieCount'] = count($parsedCookies);
            $acc['allowed_plans'] = json_decode($acc['allowed_plans'] ?? '[]', true) ?: ['pro'];
            return $acc;
        }, $accounts);
        echo json_encode(["success" => true, "accounts" => $formatted]);
        exit;
    }

    // 8.14 Create Shared Account: POST /api/admin/accounts
    if (preg_match('#^/api/admin/accounts$#', $basePath) && $method === 'POST') {
        $serviceName = trim($body['service_name'] ?? '');
        $targetUrl = trim($body['target_url'] ?? '');
        $description = trim($body['description'] ?? '');
        $cookies = is_array($body['cookies'] ?? null) ? json_encode($body['cookies']) : ($body['cookies'] ?? '[]');
        $status = $body['status'] ?? 'active';
        $allowed = json_encode($body['allowed_plans'] ?? ['plan_pro']);
        $maxUsers = (int)($body['max_users'] ?? 100);
        $id = 'acc_' . time() . '_' . substr(md5(rand()), 0, 5);

        $stmt = $pdo->prepare("INSERT INTO shared_accounts (id, service_name, target_url, description, cookies, cookie_version, status, allowed_plans, max_users) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)");
        $stmt->execute([$id, $serviceName, $targetUrl, $description, $cookies, $status, $allowed, $maxUsers]);

        echo json_encode(["success" => true, "message" => "Account created successfully.", "accountId" => $id]);
        exit;
    }

    // 8.15 Update Shared Account: PUT /api/admin/accounts/:id
    if (preg_match('#^/api/admin/accounts/([^/]+)$#', $basePath, $m) && $method === 'PUT') {
        $accId = $m[1];
        $serviceName = trim($body['service_name'] ?? '');
        $targetUrl = trim($body['target_url'] ?? '');
        $description = trim($body['description'] ?? '');
        $cookies = is_array($body['cookies'] ?? null) ? json_encode($body['cookies']) : ($body['cookies'] ?? '[]');
        $status = $body['status'] ?? 'active';
        $allowed = json_encode($body['allowed_plans'] ?? ['plan_pro']);
        $maxUsers = (int)($body['max_users'] ?? 100);

        $stmt = $pdo->prepare("UPDATE shared_accounts SET service_name=?, target_url=?, description=?, cookies=?, cookie_version = cookie_version + 1, status=?, allowed_plans=?, max_users=? WHERE id=?");
        $stmt->execute([$serviceName, $targetUrl, $description, $cookies, $status, $allowed, $maxUsers, $accId]);

        echo json_encode(["success" => true, "message" => "Account updated successfully."]);
        exit;
    }

    // 8.16 Toggle Account Status: POST /api/admin/accounts/:id/toggle
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

    // 8.17 Delete Account: DELETE /api/admin/accounts/:id
    if (preg_match('#^/api/admin/accounts/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $pdo->prepare("DELETE FROM shared_accounts WHERE id = ?")->execute([$m[1]]);
        echo json_encode(["success" => true, "message" => "Account deleted."]);
        exit;
    }

    // 8.18 Admin Test Email: POST /api/admin/test-email
    if (preg_match('#^/api/admin/test-email#', $basePath) && $method === 'POST') {
        $testTo = strtolower(trim($body['to'] ?? ''));
        $testHtml = getEmailTemplate("SMTP Test", "Admin", "Hostinger SMTP delivery verified.", "TEST-" . rand(100, 999));
        $ok = sendHostingerEmail($testTo, "ToolsByDcx - SMTP Test", $testHtml, $env);
        echo json_encode(["success" => $ok]);
        exit;
    }

    // 8.19 Admin Extension Releases: GET /api/admin/extension
    if (preg_match('#^/api/admin/extension$#', $basePath) && $method === 'GET') {
        $rows = $pdo->query("SELECT * FROM extension_releases ORDER BY created_at DESC")->fetchAll();
        $current = null;
        foreach ($rows as $r) {
            if ((int)$r['is_active'] === 1) {
                $current = $r;
                break;
            }
        }
        if (!$current && !empty($rows)) $current = $rows[0];
        $latest = $current ? $current['version'] : (!empty($rows) ? $rows[0]['version'] : '1.0.0');
        $next = empty($rows) ? '1.0.0' : getNextSemverPhp($latest);

        echo json_encode([
            "success" => true,
            "current" => $current,
            "latest_version" => $latest,
            "next_version" => $next,
            "releases" => $rows
        ]);
        exit;
    }

    // 8.20 Admin Upload Extension: POST /api/admin/extension/upload
    if (preg_match('#^/api/admin/extension/upload$#', $basePath) && $method === 'POST') {
        if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["error" => "Extension package file (.zip or .crx) is required."]);
            exit;
        }

        $versionInput = trim($_POST['version'] ?? '');
        if (empty($versionInput)) {
            $latestRow = $pdo->query("SELECT version FROM extension_releases ORDER BY created_at DESC LIMIT 1")->fetch();
            $latest = $latestRow ? $latestRow['version'] : '1.0.0';
            $cleanVersion = getNextSemverPhp($latest);
        } else {
            $cleanVersion = preg_replace('/[^0-9.]/', '', trim(ltrim($versionInput, 'vV'))) ?: '1.0.0';
        }

        $minVersionInput = trim($_POST['min_version'] ?? '');
        $cleanMinVersion = !empty($minVersionInput) ? preg_replace('/[^0-9.]/', '', trim(ltrim($minVersionInput, 'vV'))) : $cleanVersion;
        $isForced = (!empty($_POST['force_update']) && ($_POST['force_update'] === '1' || $_POST['force_update'] === 'true')) ? 1 : 0;
        $notes = trim($_POST['release_notes'] ?? '');

        $extDir = __DIR__ . '/uploads/extension';
        if (!is_dir($extDir)) {
            mkdir($extDir, 0777, true);
        }

        // Standardized server file name: toolsbydcx_extension_v{version}.zip
        $standardFileName = "toolsbydcx_extension_v{$cleanVersion}.zip";
        $targetDiskPath = $extDir . '/' . $standardFileName;

        if (file_exists($targetDiskPath)) {
            @unlink($targetDiskPath);
        }

        if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetDiskPath)) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save extension package to server disk."]);
            exit;
        }

        $fileSize = filesize($targetDiskPath);
        $relativePath = 'uploads/extension/' . $standardFileName;
        $id = 'ext_rel_' . time();
        $downloadUrl = "/api/extension/download?id={$id}";

        $pdo->query("UPDATE extension_releases SET is_active = 0");

        $stmt = $pdo->prepare("INSERT INTO extension_releases 
            (id, version, min_version, force_update, file_name, file_path, file_size, release_notes, download_url, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())");
        $stmt->execute([$id, $cleanVersion, $cleanMinVersion, $isForced, $standardFileName, $relativePath, $fileSize, $notes, $downloadUrl]);

        $newRow = $pdo->prepare("SELECT * FROM extension_releases WHERE id = ?");
        $newRow->execute([$id]);

        echo json_encode([
            "success" => true,
            "message" => "Extension v{$cleanVersion} saved as \"{$standardFileName}\"! " . ($isForced ? "Mandatory update enforced." : "Optional update enabled."),
            "release" => $newRow->fetch()
        ]);
        exit;
    }

    // 8.21 Admin Extension Settings: POST /api/admin/extension/settings
    if (preg_match('#^/api/admin/extension/settings$#', $basePath) && $method === 'POST') {
        $targetId = trim($body['id'] ?? '');
        if (!$targetId) {
            $currRow = $pdo->query("SELECT id FROM extension_releases WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1")->fetch();
            $targetId = $currRow['id'] ?? null;
        }
        if (!$targetId) {
            http_response_code(404);
            echo json_encode(["error" => "No active extension release found."]);
            exit;
        }
        $isForced = (!empty($body['force_update']) && ($body['force_update'] === '1' || $body['force_update'] === 'true' || $body['force_update'] === true)) ? 1 : 0;
        $stmt = $pdo->prepare("UPDATE extension_releases SET force_update = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$isForced, $targetId]);

        echo json_encode(["success" => true, "message" => "Force update rule updated."]);
        exit;
    }
}

// --------------------------------------------------------------------------
// 9. RESELLER ROUTES: /api/reseller/*
// --------------------------------------------------------------------------
if (preg_match('#^/api/reseller/#', $basePath)) {
    $reseller = getAuthUser($pdo, $jwtSecret);
    if (!$reseller || ($reseller['role'] !== 'reseller' && $reseller['role'] !== 'admin')) {
        http_response_code(403);
        echo json_encode(["error" => "Reseller access required."]);
        exit;
    }

    $resellerId = $reseller['id'];

    // 9.1 Stats: GET /api/reseller/stats
    if (preg_match('#^/api/reseller/stats#', $basePath) && $method === 'GET') {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE reseller_id = ?");
        $stmt->execute([$resellerId]);
        $customerCount = (int)$stmt->fetchColumn();

        $maxCustomers = (int)($reseller['max_customers'] ?? 10);
        echo json_encode([
            "success" => true,
            "stats" => [
                "totalCustomers" => $customerCount,
                "maxCustomers" => $maxCustomers,
                "availableSlots" => max(0, $maxCustomers - $customerCount)
            ]
        ]);
        exit;
    }

    // 9.2 Customers List: GET /api/reseller/users
    if (preg_match('#^/api/reseller/users$#', $basePath) && $method === 'GET') {
        $stmt = $pdo->prepare("SELECT u.id, u.name, u.email, u.role, u.plan, u.credits, u.expires_at, u.is_verified, u.is_banned, u.created_at,
            (SELECT COUNT(*) FROM extension_sessions es WHERE es.user_id = u.id) as sessions_count
            FROM users u WHERE u.reseller_id = ? ORDER BY u.created_at DESC");
        $stmt->execute([$resellerId]);
        $users = $stmt->fetchAll();
        echo json_encode(["success" => true, "users" => $users]);
        exit;
    }

    // 9.3 Create Customer: POST /api/reseller/users
    if (preg_match('#^/api/reseller/users$#', $basePath) && $method === 'POST') {
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? 'Password123!';
        $durationDays = (int)($body['durationDays'] ?? 30);

        if (!$name || !$email) {
            http_response_code(400);
            echo json_encode(["error" => "Name and email are required."]);
            exit;
        }

        $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE reseller_id = ?");
        $cntStmt->execute([$resellerId]);
        $currentCount = (int)$cntStmt->fetchColumn();
        $maxCustomers = (int)($reseller['max_customers'] ?? 10);
        if ($currentCount >= $maxCustomers) {
            http_response_code(403);
            echo json_encode(["error" => "Customer limit ($maxCustomers) reached. Please contact admin to upgrade limit."]);
            exit;
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(["error" => "A user with this email already exists."]);
            exit;
        }

        $userId = 'usr_' . time() . '_' . substr(md5(rand()), 0, 5);
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $expiresAt = date('Y-m-d H:i:s', strtotime("+$durationDays days"));

        $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password_hash, is_verified, role, reseller_id, plan, expires_at) VALUES (?, ?, ?, ?, 1, 'user', ?, 'plan_pro', ?)");
        $stmt->execute([$userId, $name, $email, $hash, $resellerId, $expiresAt]);

        echo json_encode(["success" => true, "message" => "Customer created successfully.", "id" => $userId]);
        exit;
    }

    // 9.4 Update Customer: PUT /api/reseller/users/:id
    if (preg_match('#^/api/reseller/users/([^/]+)$#', $basePath, $m) && $method === 'PUT') {
        $userId = $m[1];
        $name = trim($body['name'] ?? '');
        $email = strtolower(trim($body['email'] ?? ''));

        $pdo->prepare("UPDATE users SET name = ?, email = ? WHERE id = ? AND reseller_id = ?")->execute([$name, $email, $userId, $resellerId]);
        if (!empty($body['password'])) {
            $hash = password_hash($body['password'], PASSWORD_BCRYPT);
            $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ? AND reseller_id = ?")->execute([$hash, $userId, $resellerId]);
        }
        echo json_encode(["success" => true, "message" => "Customer updated."]);
        exit;
    }

    // 9.5 Adjust Expiry: POST /api/reseller/users/:id/adjust-expiry
    if (preg_match('#^/api/reseller/users/([^/]+)/adjust-expiry$#', $basePath, $m) && $method === 'POST') {
        $userId = $m[1];
        $days = (int)($body['days'] ?? 30);
        $newExpires = date('Y-m-d H:i:s', strtotime("+$days days"));
        $pdo->prepare("UPDATE users SET expires_at = ? WHERE id = ? AND reseller_id = ?")->execute([$newExpires, $userId, $resellerId]);
        echo json_encode(["success" => true, "expires_at" => $newExpires]);
        exit;
    }

    // 9.6 Toggle Status / Ban: POST /api/reseller/users/:id/toggle-status
    if (preg_match('#^/api/reseller/users/([^/]+)/toggle-status$#', $basePath, $m) && $method === 'POST') {
        $userId = $m[1];
        $curr = $pdo->prepare("SELECT is_banned FROM users WHERE id = ? AND reseller_id = ?");
        $curr->execute([$userId, $resellerId]);
        $row = $curr->fetch();
        if ($row) {
            $newBanned = $row['is_banned'] ? 0 : 1;
            $pdo->prepare("UPDATE users SET is_banned = ? WHERE id = ?")->execute([$newBanned, $userId]);
            echo json_encode(["success" => true, "is_banned" => $newBanned]);
            exit;
        }
        http_response_code(404);
        echo json_encode(["error" => "User not found"]);
        exit;
    }

    // 9.7 Delete Customer: DELETE /api/reseller/users/:id
    if (preg_match('#^/api/reseller/users/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $userId = $m[1];
        $pdo->prepare("DELETE FROM extension_sessions WHERE user_id = ?")->execute([$userId]);
        $pdo->prepare("DELETE FROM users WHERE id = ? AND reseller_id = ?")->execute([$userId, $resellerId]);
        echo json_encode(["success" => true, "message" => "Customer deleted."]);
        exit;
    }
}

// --------------------------------------------------------------------------
// 10. USER PORTAL ROUTES: /api/user/*
// --------------------------------------------------------------------------
if (preg_match('#^/api/user/#', $basePath)) {
    $user = getAuthUser($pdo, $jwtSecret);
    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Authentication required."]);
        exit;
    }

    $userId = $user['id'];

    // 10.1 Dashboard Overview: GET /api/user/dashboard
    if (preg_match('#^/api/user/dashboard#', $basePath) && $method === 'GET') {
        $sessStmt = $pdo->prepare("SELECT COUNT(*) FROM extension_sessions WHERE user_id = ?");
        $sessStmt->execute([$userId]);
        $activeSessions = (int)$sessStmt->fetchColumn();

        $projStmt = $pdo->prepare("SELECT COUNT(*) FROM user_projects WHERE user_id = ?");
        $projStmt->execute([$userId]);
        $projectCount = (int)$projStmt->fetchColumn();

        $accStmt = $pdo->query("SELECT COUNT(*) FROM shared_accounts WHERE status = 'active'");
        $availableTools = (int)$accStmt->fetchColumn();

        echo json_encode([
            "success" => true,
            "stats" => [
                "activeSessions" => $activeSessions,
                "projectCount" => $projectCount,
                "availableTools" => $availableTools,
                "credits" => (int)($user['credits'] ?? 100)
            ],
            "user" => [
                "name" => $user['name'],
                "email" => $user['email'],
                "plan" => $user['plan'] ?? 'pro',
                "expires_at" => $user['expires_at']
            ]
        ]);
        exit;
    }

    // 10.2 User Resources / Shared Accounts: GET /api/user/resources
    if (preg_match('#^/api/user/resources#', $basePath) && $method === 'GET') {
        $accounts = $pdo->query("SELECT id, service_name, target_url, description, status FROM shared_accounts WHERE status = 'active'")->fetchAll();
        echo json_encode(["success" => true, "resources" => $accounts]);
        exit;
    }

    // 10.3 User Extension Sessions: GET /api/user/sessions
    if (preg_match('#^/api/user/sessions$#', $basePath) && $method === 'GET') {
        $stmt = $pdo->prepare("SELECT es.*, sa.service_name FROM extension_sessions es LEFT JOIN shared_accounts sa ON es.account_id = sa.id WHERE es.user_id = ? ORDER BY es.last_active DESC");
        $stmt->execute([$userId]);
        echo json_encode(["success" => true, "sessions" => $stmt->fetchAll()]);
        exit;
    }

    // 10.4 Delete User Session: DELETE /api/user/sessions/:id
    if (preg_match('#^/api/user/sessions/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $pdo->prepare("DELETE FROM extension_sessions WHERE id = ? AND user_id = ?")->execute([$m[1], $userId]);
        echo json_encode(["success" => true, "message" => "Session terminated."]);
        exit;
    }

    // 10.5 User Projects: GET /api/user/projects
    if (preg_match('#^/api/user/projects$#', $basePath) && $method === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM user_projects WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        echo json_encode(["success" => true, "projects" => $stmt->fetchAll()]);
        exit;
    }

    // 10.6 Create User Project: POST /api/user/projects
    if (preg_match('#^/api/user/projects$#', $basePath) && $method === 'POST') {
        $title = trim($body['title'] ?? 'Google Flow Project');
        $projectId = trim($body['project_id'] ?? ('proj_' . time()));
        $projectUrl = trim($body['project_url'] ?? 'https://labs.google/fx/tools/flow');

        $id = 'up_' . time() . '_' . substr(md5(rand()), 0, 5);
        $stmt = $pdo->prepare("INSERT INTO user_projects (id, user_id, project_id, project_url, title) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$id, $userId, $projectId, $projectUrl, $title]);

        echo json_encode(["success" => true, "message" => "Project saved.", "id" => $id]);
        exit;
    }

    // 10.7 Delete User Project: DELETE /api/user/projects/:id
    if (preg_match('#^/api/user/projects/([^/]+)$#', $basePath, $m) && $method === 'DELETE') {
        $pdo->prepare("DELETE FROM user_projects WHERE id = ? AND user_id = ?")->execute([$m[1], $userId]);
        echo json_encode(["success" => true, "message" => "Project deleted."]);
        exit;
    }

    // 10.8 Update User Profile: PUT /api/user/profile
    if (preg_match('#^/api/user/profile$#', $basePath) && $method === 'PUT') {
        $name = trim($body['name'] ?? $user['name']);
        $pdo->prepare("UPDATE users SET name = ? WHERE id = ?")->execute([$name, $userId]);
        if (!empty($body['password'])) {
            $hash = password_hash($body['password'], PASSWORD_BCRYPT);
            $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $userId]);
        }
        echo json_encode(["success" => true, "message" => "Profile updated."]);
        exit;
    }
}

// --------------------------------------------------------------------------
// 11. CHROME EXTENSION RUNTIME API ENDPOINTS: /api/extension/*
// --------------------------------------------------------------------------
if (preg_match('#^/api/extension(2)?/#', $basePath)) {
    // 11.1 Extension Inject Cookies: POST /api/extension/inject-cookies
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
            "cookieVersion" => (int)($acc['cookie_version'] ?? 1),
            "accountUrl" => $acc['target_url']
        ]);
        exit;
    }

    // 11.2 Extension Verify: POST /api/extension/verify
    if (preg_match('#^/api/extension(2)?/verify#', $basePath) && $method === 'POST') {
        echo json_encode([
            "ok" => true,
            "valid" => true,
            "user" => [
                "id" => "usr_active",
                "name" => "ToolsByDcx Subscriber",
                "email" => "user@toolsbydcx.com",
                "plan" => "pro",
                "creditsLeft" => 999,
                "daysRemaining" => 30,
                "planExpiresAt" => date('Y-m-d\TH:i:s\Z', strtotime('+30 days'))
            ],
            "cookieSystemDisabled" => false
        ]);
        exit;
    }

    // 11.3 Extension Cookie Version: GET/POST /api/extension/cookie-version
    if (preg_match('#^/api/extension(2)?/cookie-version#', $basePath)) {
        $row = $pdo->query("SELECT MAX(cookie_version) as max_v FROM shared_accounts")->fetch();
        $version = (string)($row['max_v'] ?? '1');
        echo json_encode(["ok" => true, "version" => $version]);
        exit;
    }

    // 11.4 Extension Switch Account: POST /api/extension/switch-account
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

    // 11.5 Extension Download: GET /api/extension/download
    if (preg_match('#^/api/extension/download#', $basePath) && $method === 'GET') {
        $token = $_GET['token'] ?? null;
        if (!$token) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            if (strpos($authHeader, 'Bearer ') === 0) {
                $token = substr($authHeader, 7);
            }
        }
        if (!$token) {
            http_response_code(401);
            echo json_encode(["error" => "Authentication required to download extension.", "login_required" => true]);
            exit;
        }
        $authUser = getAuthUser($pdo, $jwtSecret, $token);
        if (!$authUser) {
            http_response_code(401);
            echo json_encode(["error" => "Invalid session. Please login to download.", "login_required" => true]);
            exit;
        }

        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM extension_releases WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
        } else {
            $row = $pdo->query("SELECT * FROM extension_releases WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1")->fetch();
        }
        if (!$row) {
            http_response_code(404);
            echo json_encode(["error" => "No extension package available."]);
            exit;
        }

        $filePath = __DIR__ . '/' . $row['file_path'];
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(["error" => "Package file not found on disk."]);
            exit;
        }

        header('Content-Description: File Transfer');
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . basename($row['file_name']) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    }

    // 11.6 Extension Version Check: GET /api/extension/check-update or /api/extension/version
    if (preg_match('#^/api/extension/(check-update|version)#', $basePath) && $method === 'GET') {
        $current = $pdo->query("SELECT * FROM extension_releases WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1")->fetch();
        if (!$current) {
            echo json_encode([
                "ok" => true,
                "update_available" => false,
                "update_required" => false,
                "latest_version" => "1.0.0",
                "min_version" => "1.0.0",
                "force_update" => false
            ]);
            exit;
        }
        $clientVersion = $_GET['version'] ?? ($_SERVER['HTTP_X_EXTENSION_VERSION'] ?? '0.0.0');
        $isOutdated = version_compare($clientVersion, $current['version'], '<');
        $isBelowMin = version_compare($clientVersion, $current['min_version'] ?: $current['version'], '<');
        $forceUpdate = ((int)$current['force_update'] === 1) && ($isBelowMin || $isOutdated);

        echo json_encode([
            "ok" => true,
            "client_version" => $clientVersion,
            "latest_version" => $current['version'],
            "min_version" => $current['min_version'] ?: $current['version'],
            "force_update" => (bool)$current['force_update'],
            "update_available" => $isOutdated,
            "update_required" => $forceUpdate,
            "download_url" => $current['download_url'] ?: '/api/extension/download',
            "file_name" => $current['file_name'],
            "file_size" => (int)$current['file_size'],
            "release_notes" => $current['release_notes']
        ]);
        exit;
    }
}

// Fallback: 404
http_response_code(404);
echo json_encode(["error" => "Endpoint not found", "endpoint" => $basePath]);
