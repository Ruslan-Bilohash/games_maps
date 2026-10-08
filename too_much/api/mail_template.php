<?php
// «Двобій 3D» — гарний лист входу (код + посилання) і надсилання через mail()/SMTP/лог.
declare(strict_types=1);

function mail_texts(string $lang): array
{
    $T = [
        'uk' => [
            'subject' => 'Твій код входу: {code} — Двобій 3D',
            'pre'     => 'Код {code} — вхід у Двобій 3D. Діє {ttl} хв.',
            'hello'   => 'Готовий до бою?',
            'lead'    => 'Хтось (сподіваємось, ти) хоче увійти в «Двобій 3D», щоб зберігати проходження кампанії. Введи цей код у грі:',
            'or'      => 'або просто натисни кнопку — і гра відкриється вже з входом:',
            'button'  => 'УВІЙТИ В ГРУ',
            'ttl'     => 'Код і кнопка діють {ttl} хвилин і спрацьовують лише один раз.',
            'ignore'  => 'Якщо ти не просив цей лист — просто проігноруй його, без коду ніхто не увійде.',
            'link'    => 'Кнопка не працює? Скопіюй посилання в браузер:',
            'foot'    => 'Двобій 3D · файтинг у браузері',
            'motto'   => 'FIGHT!',
        ],
        'en' => [
            'subject' => 'Your login code: {code} — Duel 3D',
            'pre'     => 'Code {code} — sign in to Duel 3D. Valid for {ttl} min.',
            'hello'   => 'Ready to fight?',
            'lead'    => 'Someone (hopefully you) wants to sign in to «Duel 3D» to save campaign progress. Enter this code in the game:',
            'or'      => 'or just press the button — the game opens already signed in:',
            'button'  => 'ENTER THE GAME',
            'ttl'     => 'The code and the button are valid for {ttl} minutes and work only once.',
            'ignore'  => 'If you didn’t request this email, just ignore it — nobody can sign in without the code.',
            'link'    => 'Button not working? Copy this link into your browser:',
            'foot'    => 'Duel 3D · a browser fighting game',
            'motto'   => 'FIGHT!',
        ],
        'no' => [
            'subject' => 'Innloggingskoden din: {code} — Duell 3D',
            'pre'     => 'Kode {code} — logg inn i Duell 3D. Gyldig i {ttl} min.',
            'hello'   => 'Klar til kamp?',
            'lead'    => 'Noen (forhåpentligvis deg) vil logge inn i «Duell 3D» for å lagre kampanjefremgangen. Skriv inn denne koden i spillet:',
            'or'      => 'eller bare trykk på knappen — spillet åpnes ferdig innlogget:',
            'button'  => 'GÅ INN I SPILLET',
            'ttl'     => 'Koden og knappen er gyldige i {ttl} minutter og virker bare én gang.',
            'ignore'  => 'Hvis du ikke ba om denne e-posten, kan du bare ignorere den — ingen kommer inn uten koden.',
            'link'    => 'Virker ikke knappen? Kopier lenken inn i nettleseren:',
            'foot'    => 'Duell 3D · et kampspill i nettleseren',
            'motto'   => 'FIGHT!',
        ],
    ];
    return $T[$lang] ?? $T['uk'];
}

function mail_fill(string $s, array $vars): string
{
    foreach ($vars as $k => $v) $s = str_replace('{' . $k . '}', (string)$v, $s);
    return $s;
}

function login_mail_html(array $t, string $code, string $link, int $ttl, string $lang, string $site): string
{
    $e = fn(string $s) => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $v = ['code' => $code, 'ttl' => $ttl];
    $digits = '';
    foreach (str_split($code) as $d) {
        $digits .= '<td style="padding:0 3px"><div style="width:44px;height:58px;line-height:58px;background:#1b1418;border:1px solid #5a2a22;border-radius:10px;font:800 32px/58px \'Segoe UI\',Arial,sans-serif;color:#ffd166;text-align:center;letter-spacing:0">' . $e($d) . '</div></td>';
    }
    $pre = $e(mail_fill($t['pre'], $v));
    $L = $e($link);
    return '<!doctype html>
<html lang="' . $e($lang) . '">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>' . $e(mail_fill($t['subject'], $v)) . '</title>
</head>
<body style="margin:0;padding:0;background:#0b0809;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0b0809">' . $pre . '&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0809;background-image:radial-gradient(ellipse at top,#3a1410 0%,#0b0809 60%);">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
    <tr><td align="center" style="padding:6px 0 18px">
      <div style="font:900 13px/1 \'Segoe UI\',Arial,sans-serif;letter-spacing:6px;color:#ff6b3d;text-transform:uppercase">' . $e($t['motto']) . '</div>
      <div style="font:900 40px/1.1 Impact,\'Arial Black\',\'Segoe UI\',sans-serif;color:#ffffff;letter-spacing:2px;margin-top:8px;text-shadow:0 2px 0 #7a1d12,0 0 24px #ff4a1c">' . ($lang === 'uk' ? 'ДВОБІЙ 3D' : ($lang === 'no' ? 'DUELL 3D' : 'DUEL 3D')) . '</div>
    </td></tr>
    <tr><td style="background:#150f11;border:1px solid #3b201c;border-radius:18px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="height:5px;background:#ff4a1c;background-image:linear-gradient(90deg,#ffd166,#ff4a1c,#b3122a);font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:30px 30px 6px;font:800 24px/1.25 \'Segoe UI\',Arial,sans-serif;color:#ffffff">' . $e($t['hello']) . '</td></tr>
        <tr><td style="padding:6px 30px 18px;font:400 16px/1.55 \'Segoe UI\',Arial,sans-serif;color:#d9cfcb">' . $e($t['lead']) . '</td></tr>
        <tr><td align="center" style="padding:4px 20px 8px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' . $digits . '</tr></table>
        </td></tr>
        <tr><td align="center" style="padding:16px 30px 10px;font:400 15px/1.5 \'Segoe UI\',Arial,sans-serif;color:#a99a95">' . $e($t['or']) . '</td></tr>
        <tr><td align="center" style="padding:6px 30px 24px">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="' . $L . '" style="height:54px;v-text-anchor:middle;width:300px;" arcsize="20%" stroke="f" fillcolor="#e0391a"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">' . $e($t['button']) . '</center></v:roundrect><![endif]-->
          <!--[if !mso]><!-- --><a href="' . $L . '" target="_blank" style="display:inline-block;background:#e0391a;background-image:linear-gradient(180deg,#ff6b3d,#c42a12);color:#ffffff;text-decoration:none;font:900 17px/54px \'Segoe UI\',Arial,sans-serif;letter-spacing:2px;padding:0 38px;border-radius:12px;box-shadow:0 6px 22px rgba(255,74,28,.45)">&#9876;&nbsp; ' . $e($t['button']) . '</a><!--<![endif]-->
        </td></tr>
        <tr><td style="padding:0 30px"><div style="height:1px;background:#3b201c;font-size:0;line-height:0">&nbsp;</div></td></tr>
        <tr><td style="padding:18px 30px 4px;font:400 14px/1.55 \'Segoe UI\',Arial,sans-serif;color:#ffd166">&#9200; ' . $e(mail_fill($t['ttl'], $v)) . '</td></tr>
        <tr><td style="padding:6px 30px 18px;font:400 14px/1.55 \'Segoe UI\',Arial,sans-serif;color:#8f817c">' . $e($t['ignore']) . '</td></tr>
        <tr><td style="padding:0 30px 26px;font:400 12px/1.5 \'Segoe UI\',Arial,sans-serif;color:#7a6c68">' . $e($t['link']) . '<br><a href="' . $L . '" style="color:#ff8a5c;word-break:break-all">' . $L . '</a></td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:18px 10px 6px;font:400 12px/1.5 \'Segoe UI\',Arial,sans-serif;color:#6d605c">
      ' . $e($t['foot']) . ' · <a href="' . $e($site) . '" style="color:#a0857c;text-decoration:none">' . $e(preg_replace('~^https?://~', '', $site)) . '</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>';
}

function login_mail_text(array $t, string $code, string $link, int $ttl, string $site): string
{
    $v = ['code' => $code, 'ttl' => $ttl];
    return $t['hello'] . "\n\n" . $t['lead'] . "\n\n    " . implode(' ', str_split($code)) . "\n\n"
        . $t['or'] . "\n" . $link . "\n\n"
        . mail_fill($t['ttl'], $v) . "\n" . $t['ignore'] . "\n\n— " . $t['foot'] . "\n" . $site . "\n";
}

function mail_header_enc(string $s): string
{
    return preg_match('/[^\x20-\x7e]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s;
}

function send_login_mail(array $CFG, string $email, string $code, string $link, string $lang, int $ttl): bool
{
    $t = mail_texts($lang);
    $site = rtrim((string)$CFG['site_url'], '/');
    $subject = mail_fill($t['subject'], ['code' => $code, 'ttl' => $ttl]);
    $html = login_mail_html($t, $code, $link, $ttl, $lang, $site);
    $text = login_mail_text($t, $code, $link, $ttl, $site);

    $from = (string)($CFG['mail_from'] ?? 'no-reply@localhost');
    $fromName = (string)($CFG['mail_from_name'] ?? 'Duel 3D');
    $host = parse_url($site, PHP_URL_HOST) ?: 'localhost';
    $boundary = 'b_' . bin2hex(random_bytes(12));
    $msgId = '<' . bin2hex(random_bytes(12)) . '@' . $host . '>';

    $headers = [
        'From' => mail_header_enc($fromName) . ' <' . $from . '>',
        'Reply-To' => $from,
        'MIME-Version' => '1.0',
        'Content-Type' => 'multipart/alternative; boundary="' . $boundary . '"',
        'Message-ID' => $msgId,
        'Date' => date('r'),
        'X-Mailer' => 'Duel3D',
        'Auto-Submitted' => 'auto-generated',
    ];
    $bodyMime = "This is a multi-part message in MIME format.\r\n\r\n"
        . "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($text)) . "\r\n"
        . "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html)) . "\r\n"
        . "--$boundary--\r\n";

    $mode = (string)($CFG['mail_mode'] ?? 'mail');
    if ($mode === 'log') {
        $dir = rtrim((string)$CFG['data_dir'], '/');
        if (!is_dir($dir)) @mkdir($dir, 0750, true);
        $entry = '=== ' . date('c') . " to: $email\nSubject: $subject\nCode: $code\nLink: $link\n\n";
        @file_put_contents($dir . '/last_mail.html', $html);
        return @file_put_contents($dir . '/mail.log', $entry, FILE_APPEND) !== false;
    }
    if ($mode === 'smtp') {
        return smtp_send((array)($CFG['smtp'] ?? []), $from, $email, mail_header_enc($subject), $headers, $bodyMime, $host);
    }
    $hdr = '';
    foreach ($headers as $k => $v) $hdr .= "$k: $v\r\n";
    return @mail($email, mail_header_enc($subject), $bodyMime, rtrim($hdr), '-f' . $from);
}

// Мінімальний SMTP-клієнт: SSL (465) або STARTTLS (587), AUTH LOGIN.
function smtp_send(array $S, string $from, string $to, string $subject, array $headers, string $body, string $ehlo): bool
{
    $host = (string)($S['host'] ?? '');
    $port = (int)($S['port'] ?? 465);
    $secure = strtolower((string)($S['secure'] ?? 'ssl'));
    if ($host === '') return false;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true]]);
    $addr = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $fp = @stream_socket_client($addr, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) return false;
    stream_set_timeout($fp, 15);

    $read = function () use ($fp): string {
        $resp = '';
        while (($line = fgets($fp, 1024)) !== false) {
            $resp .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return $resp;
    };
    $cmd = function (string $c, array $ok) use ($fp, $read): bool {
        if ($c !== '') fwrite($fp, $c . "\r\n");
        $r = $read();
        return in_array((int)substr($r, 0, 3), $ok, true);
    };

    $ok = $cmd('', [220]) && $cmd('EHLO ' . $ehlo, [250]);
    if ($ok && $secure === 'tls') {
        $ok = $cmd('STARTTLS', [220])
            && stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)
            && $cmd('EHLO ' . $ehlo, [250]);
    }
    if ($ok && (string)($S['user'] ?? '') !== '') {
        $ok = $cmd('AUTH LOGIN', [334])
            && $cmd(base64_encode((string)$S['user']), [334])
            && $cmd(base64_encode((string)($S['pass'] ?? '')), [235]);
    }
    $ok = $ok && $cmd('MAIL FROM:<' . $from . '>', [250]) && $cmd('RCPT TO:<' . $to . '>', [250, 251]) && $cmd('DATA', [354]);
    if ($ok) {
        $msg = '';
        foreach ($headers as $k => $v) $msg .= "$k: $v\r\n";
        $msg .= "To: <$to>\r\nSubject: $subject\r\n\r\n" . $body;
        // крапка на початку рядка подвоюється (RFC 5321)
        $msg = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $msg));
        fwrite($fp, $msg . "\r\n.\r\n");
        $ok = $cmd('', [250]);
    }
    @fwrite($fp, "QUIT\r\n");
    fclose($fp);
    return $ok;
}
