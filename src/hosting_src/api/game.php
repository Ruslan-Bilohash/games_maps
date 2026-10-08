<?php
// «Двобій 3D» — API входу через email і збереження проходження.
// Запити: POST api/game.php?a=ping|request|verify|me|save|logout, тіло — JSON.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) {
    out(['ok' => false, 'error' => 'not_configured'], 503);
}
$CFG = require $cfgFile;
if (!is_array($CFG) || ($CFG['secret'] ?? '') === '' || str_contains((string)$CFG['secret'], 'ЗАМІНИ')) {
    out(['ok' => false, 'error' => 'not_configured'], 503);
}
require __DIR__ . '/mail_template.php';

function out(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): array
{
    $raw = file_get_contents('php://input', false, null, 0, 65536);
    $j = json_decode($raw ?: '[]', true);
    return is_array($j) ? $j : [];
}

function db(): PDO
{
    static $pdo = null;
    global $CFG;
    if ($pdo) return $pdo;
    $dir = rtrim((string)$CFG['data_dir'], '/');
    if (!is_dir($dir) && !mkdir($dir, 0750, true)) out(['ok' => false, 'error' => 'storage'], 500);
    $ht = $dir . '/.htaccess';
    if (!is_file($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");
    $pdo = new PDO('sqlite:' . $dir . '/duel.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000;');
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, progress TEXT, created INTEGER, updated INTEGER)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS codes (id INTEGER PRIMARY KEY, email TEXT NOT NULL, code_hash TEXT NOT NULL, token_hash TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER DEFAULT 0, used INTEGER DEFAULT 0, created INTEGER NOT NULL, ip TEXT)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS codes_email ON codes(email)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS codes_token ON codes(token_hash)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created INTEGER, expires INTEGER)');
    return $pdo;
}

function h(string $v): string
{
    global $CFG;
    return hash_hmac('sha256', $v, (string)$CFG['secret']);
}

function client_ip(): string
{
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
}

function norm_email(string $e): string
{
    $e = strtolower(trim($e));
    if (strlen($e) > 190 || !filter_var($e, FILTER_VALIDATE_EMAIL)) return '';
    return $e;
}

function user_by_email(string $email): ?array
{
    $st = db()->prepare('SELECT * FROM users WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    return $u ?: null;
}

function ensure_user(string $email): array
{
    $u = user_by_email($email);
    if ($u) return $u;
    $st = db()->prepare('INSERT INTO users (email, progress, created, updated) VALUES (?, NULL, ?, ?)');
    $st->execute([$email, time(), time()]);
    return user_by_email($email);
}

function session_user(): ?array
{
    $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/^Bearer\s+([a-f0-9]{64})$/i', $auth, $m)) {
        $b = body();
        if (!isset($b['session']) || !preg_match('/^[a-f0-9]{64}$/i', (string)$b['session'])) return null;
        $tok = (string)$b['session'];
    } else {
        $tok = $m[1];
    }
    $st = db()->prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?');
    $st->execute([h($tok), time()]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    return $u ?: null;
}

function new_session(array $user): string
{
    global $CFG;
    $tok = bin2hex(random_bytes(32));
    $st = db()->prepare('INSERT INTO sessions (token_hash, user_id, created, expires) VALUES (?, ?, ?, ?)');
    $st->execute([h($tok), (int)$user['id'], time(), time() + 86400 * (int)($CFG['session_days'] ?? 120)]);
    return $tok;
}

// Прогрес: лише відомі поля, обмежений розмір
function clean_progress($p): ?array
{
    if (!is_array($p)) return null;
    $out = [];
    if (isset($p['camp']) && is_array($p['camp'])) {
        $c = $p['camp'];
        $out['camp'] = [
            'char' => preg_match('/^[a-z]{2,12}$/', (string)($c['char'] ?? '')) ? (string)$c['char'] : 'taras',
            'stage' => max(0, min(20, (int)($c['stage'] ?? 0))),
            'done' => !empty($c['done']),
            'losses' => max(0, min(100000, (int)($c['losses'] ?? 0))),
        ];
    }
    if (isset($p['champs']) && is_array($p['champs'])) {
        $out['champs'] = array_values(array_slice(array_filter($p['champs'], fn($v) => is_string($v) && preg_match('/^[a-z]{2,12}$/', $v)), 0, 20));
    }
    foreach (['char' => '/^[a-z]{2,12}$/', 'lang' => '/^(uk|en|no)$/', 'arena' => '/^[a-z]{2,12}$/'] as $k => $re) {
        if (isset($p[$k]) && is_string($p[$k]) && preg_match($re, $p[$k])) $out[$k] = $p[$k];
    }
    if (isset($p['nick']) && is_string($p['nick'])) $out['nick'] = mb_substr(trim($p['nick']), 0, 16);
    if (isset($p['diff'])) $out['diff'] = max(0, min(2, (int)$p['diff']));
    return $out;
}

$a = (string)($_GET['a'] ?? '');
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $a !== 'ping') out(['ok' => false, 'error' => 'method'], 405);

switch ($a) {
    case 'ping':
        out(['ok' => true, 'v' => 1]);

    case 'request': {
        $b = body();
        $email = norm_email((string)($b['email'] ?? ''));
        $lang = in_array($b['lang'] ?? '', ['uk', 'en', 'no'], true) ? $b['lang'] : 'uk';
        if ($email === '') out(['ok' => false, 'error' => 'bad_email'], 400);
        $now = time();
        $pdo = db();
        // не частіше ніж раз на хвилину й 6 разів на годину для адреси, 20 разів на годину з однієї IP
        $st = $pdo->prepare('SELECT COUNT(*) FROM codes WHERE email = ? AND created > ?');
        $st->execute([$email, $now - 60]);
        if ((int)$st->fetchColumn() > 0) out(['ok' => false, 'error' => 'too_soon'], 429);
        $st->execute([$email, $now - 3600]);
        if ((int)$st->fetchColumn() >= 6) out(['ok' => false, 'error' => 'too_many'], 429);
        $st = $pdo->prepare('SELECT COUNT(*) FROM codes WHERE ip = ? AND created > ?');
        $st->execute([client_ip(), $now - 3600]);
        if ((int)$st->fetchColumn() >= 20) out(['ok' => false, 'error' => 'too_many'], 429);
        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $token = bin2hex(random_bytes(24));
        $ttl = (int)($CFG['code_ttl_min'] ?? 15);
        $pdo->prepare('UPDATE codes SET used = 1 WHERE email = ? AND used = 0')->execute([$email]);
        $pdo->prepare('INSERT INTO codes (email, code_hash, token_hash, expires, created, ip) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$email, h($email . '|' . $code), h('t|' . $token), $now + $ttl * 60, $now, client_ip()]);
        $pdo->prepare('DELETE FROM codes WHERE expires < ?')->execute([$now - 86400]);
        $link = rtrim((string)$CFG['site_url'], '/') . '/?login=' . $token . '&lang=' . $lang;
        if (!send_login_mail($CFG, $email, $code, $link, $lang, $ttl)) out(['ok' => false, 'error' => 'mail_failed'], 502);
        out(['ok' => true]);
    }

    case 'verify': {
        $b = body();
        $pdo = db();
        $now = time();
        $row = null;
        if (!empty($b['token']) && preg_match('/^[a-f0-9]{48}$/', (string)$b['token'])) {
            $st = $pdo->prepare('SELECT * FROM codes WHERE token_hash = ? AND used = 0 AND expires > ?');
            $st->execute([h('t|' . $b['token']), $now]);
            $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
        } else {
            $email = norm_email((string)($b['email'] ?? ''));
            $code = preg_replace('/\D/', '', (string)($b['code'] ?? ''));
            if ($email === '' || strlen($code) !== 6) out(['ok' => false, 'error' => 'bad_code'], 400);
            $st = $pdo->prepare('SELECT * FROM codes WHERE email = ? AND used = 0 AND expires > ? ORDER BY id DESC LIMIT 1');
            $st->execute([$email, $now]);
            $cand = $st->fetch(PDO::FETCH_ASSOC) ?: null;
            if ($cand) {
                if ((int)$cand['attempts'] >= 5) out(['ok' => false, 'error' => 'bad_code'], 400);
                if (hash_equals($cand['code_hash'], h($email . '|' . $code))) $row = $cand;
                else $pdo->prepare('UPDATE codes SET attempts = attempts + 1 WHERE id = ?')->execute([(int)$cand['id']]);
            }
        }
        if (!$row) out(['ok' => false, 'error' => 'bad_code'], 400);
        $pdo->prepare('UPDATE codes SET used = 1 WHERE id = ?')->execute([(int)$row['id']]);
        $user = ensure_user($row['email']);
        $session = new_session($user);
        out(['ok' => true, 'session' => $session, 'email' => $user['email'], 'progress' => $user['progress'] ? json_decode($user['progress'], true) : null]);
    }

    case 'me': {
        $u = session_user();
        if (!$u) out(['ok' => false, 'error' => 'auth'], 401);
        out(['ok' => true, 'email' => $u['email'], 'progress' => $u['progress'] ? json_decode($u['progress'], true) : null]);
    }

    case 'save': {
        $u = session_user();
        if (!$u) out(['ok' => false, 'error' => 'auth'], 401);
        $b = body();
        $p = clean_progress($b['progress'] ?? null);
        if ($p === null) out(['ok' => false, 'error' => 'bad_progress'], 400);
        $json = json_encode($p, JSON_UNESCAPED_UNICODE);
        if (strlen($json) > 8192) out(['ok' => false, 'error' => 'too_big'], 413);
        db()->prepare('UPDATE users SET progress = ?, updated = ? WHERE id = ?')->execute([$json, time(), (int)$u['id']]);
        out(['ok' => true]);
    }

    case 'logout': {
        $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if (preg_match('/^Bearer\s+([a-f0-9]{64})$/i', $auth, $m)) db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([h($m[1])]);
        out(['ok' => true]);
    }

    default:
        out(['ok' => false, 'error' => 'unknown'], 404);
}
