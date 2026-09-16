<?php
$pdo = new PDO('mysql:host=localhost;dbname=u390461415_toolsbydcx;charset=utf8mb4', 'u390461415_toolsbydcx', '0TN&pstO/x');
$cols = $pdo->query('DESCRIBE users')->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $c) {
    echo $c['Field'] . " (" . $c['Type'] . ")\n";
}
