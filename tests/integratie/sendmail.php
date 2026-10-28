<?php
//
// Stand-in for sendmail in the test container: PHP's mail() pipes the message to this script, which hands it over
// SMTP to the server that tests/integratie/test_mail.py runs on the host. Without a server the message is dropped and
// the script still exits 0, so the other tests see the same mail() as before. Test container only.
//
// Usage (sendmail_path in the ini that tests/integratie/run.sh mounts): php sendmail.php <host> <port> [-f <sender>]
//
$host = $argv[1] ?? 'host.docker.internal';
$port = (int)($argv[2] ?? 25);
$sender = '';
for ($i = 3; $i < count($argv); $i++) {
	if (str_starts_with($argv[$i], '-f')) $sender = trim(strlen($argv[$i]) > 2 ? substr($argv[$i], 2) : ($argv[++$i] ?? ''));
}
$message = str_replace(["\r\n", "\r"], "\n", stream_get_contents(STDIN));
[$head] = explode("\n\n", $message, 2);
//
// The recipients are in the To header that mail() adds; a folded header continues on lines that start with a space.
//
$to = [];
if (preg_match('/^To:(.*(?:\n[ \t].*)*)/mi', $head, $match)) {
	foreach (explode(',', $match[1]) as $address) {
		if (preg_match('/<([^>]+)>/', $address, $inner)) $address = $inner[1];
		if (trim($address) !== '') $to[] = trim($address);
	}
}
$smtp = @fsockopen($host, $port, $errno, $errstr, 2);
if (!$smtp) exit(0);
stream_set_timeout($smtp, 5);
function hypha_testSmtp($smtp, $line, $expect) {
	if ($line !== null) fwrite($smtp, $line . "\r\n");
	do {
		$reply = fgets($smtp);
	} while ($reply !== false && isset($reply[3]) && $reply[3] === '-');
	if ($reply === false || substr($reply, 0, 3) !== $expect) {
		fwrite(STDERR, 'SMTP: ' . ($line ?? 'greeting') . ' gave ' . trim((string)$reply) . "\n");
		exit(75);
	}
}
hypha_testSmtp($smtp, null, '220');
hypha_testSmtp($smtp, 'EHLO hypha-test', '250');
hypha_testSmtp($smtp, 'MAIL FROM:<' . $sender . '>', '250');
foreach ($to as $address) hypha_testSmtp($smtp, 'RCPT TO:<' . $address . '>', '250');
hypha_testSmtp($smtp, 'DATA', '354');
//
// Dot stuffing (RFC 5321, 4.5.2): a line that starts with a dot gets a second dot.
//
$data = preg_replace('/^\./m', '..', rtrim($message, "\n"));
fwrite($smtp, str_replace("\n", "\r\n", $data) . "\r\n");
hypha_testSmtp($smtp, '.', '250');
hypha_testSmtp($smtp, 'QUIT', '221');
exit(0);
