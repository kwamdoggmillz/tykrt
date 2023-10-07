<?php
header('Content-Type: application/json');
require_once 'vendor/autoload.php';

// Load credentials from .env
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$client = new Google_Client();
$client->useApplicationDefaultCredentials();
$client->addScope('https://www.googleapis.com/auth/monitoring.read');

// Set the config for the service account from .env
$client->setClientId($_ENV['GOOGLE_CLIENT_ID']);
$client->setClientEmail($_ENV['GOOGLE_CLIENT_EMAIL']);
$client->setClientPrivateKey(str_replace('\n', "\n", $_ENV['GOOGLE_PRIVATE_KEY']));  // Replace escaped newline with real newline
$client->setConfig('token_uri', $_ENV['GOOGLE_TOKEN_URI']);

// Fetch token
if ($client->isAccessTokenExpired()) {
    $client->refreshTokenWithAssertion();
}

$accessToken = $client->getAccessToken();

// Define the endpoint for fetching quota metrics
$projectId = $_ENV['GOOGLE_PROJECT_ID'];
$currentTime = new DateTime('now', new DateTimeZone('UTC'));
$beginOfDay = new DateTime('today midnight', new DateTimeZone('UTC'));

$filter = sprintf(
    'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.type="api" AND timestamp >= "%s" AND timestamp <= "%s"',
    $beginOfDay->format('Y-m-d\TH:i:s\Z'),  // Start of the day in UTC
    $currentTime->format('Y-m-d\TH:i:s\Z')  // Current time in UTC
);

$url = "https://monitoring.googleapis.com/v3/projects/{$projectId}/timeSeries?filter={$filter}&interval.startTime={$beginOfDay->format('Y-m-d\TH:i:s\Z')}&interval.endTime={$currentTime->format('Y-m-d\TH:i:s\Z')}";

$opts = [
    "http" => [
        "method" => "GET",
        "header" => "Authorization: Bearer " . $accessToken['access_token']
    ]
];

$context = stream_context_create($opts);
$response = file_get_contents($url, false, $context);
$data = json_decode($response, true);

// Assuming you have a predefined quota limit
$quotaLimit = 10000; // Replace this with your actual quota limit
$quotaUsed = 0;

if (isset($data['timeSeries'][0]['points'][0]['value']['int64Value'])) {
    $quotaUsed = $data['timeSeries'][0]['points'][0]['value']['int64Value'];
}

$percentageUsed = ($quotaUsed / $quotaLimit) * 100;

// Output the percentage used
echo json_encode(['percentageUsed' => $percentageUsed]);

?>
