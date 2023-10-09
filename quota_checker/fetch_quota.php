<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Load Composer's autoloader
require_once 'vendor/autoload.php';

// Set up Dotenv and load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

if (!isset($_ENV['GOOGLE_SERVICE_ACCOUNT_JSON'])) {
    die("Environment variable GOOGLE_SERVICE_ACCOUNT_JSON not set.");
}

if (!isset($_ENV['GOOGLE_PROJECT_ID'])) {
    die("Environment variable GOOGLE_PROJECT_ID not set.");
}

// Set up and authenticate the Google Client
$client = new Google_Client();
$serviceAccountCredentials = $_ENV['GOOGLE_SERVICE_ACCOUNT_JSON'];
$client->setAuthConfig(json_decode($serviceAccountCredentials, true));
$client->addScope('https://www.googleapis.com/auth/monitoring.read');

if ($client->isAccessTokenExpired()) {
    $client->fetchAccessTokenWithAssertion();
}

$accessToken = $client->getAccessToken();

// Define the endpoint for fetching quota metrics
$projectId = $_ENV['GOOGLE_PROJECT_ID'];
$currentTime = new DateTime('now', new DateTimeZone('UTC'));
$beginOfDay = new DateTime('today midnight', new DateTimeZone('UTC'));

$filter = sprintf(
    'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.type="api" AND timestamp >= "%s" AND timestamp <= "%s"',
    $beginOfDay->format('Y-m-d\TH:i:s\Z'),
    $currentTime->format('Y-m-d\TH:i:s\Z')
);

$filter = urlencode($filter);

$url = "https://monitoring.googleapis.com/v3/projects/{$projectId}/timeSeries?filter={$filter}&interval.startTime={$beginOfDay->format('Y-m-d\TH:i:s\Z')}&interval.endTime={$currentTime->format('Y-m-d\TH:i:s\Z')}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $accessToken['access_token'],
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$curlErrno = curl_errno($ch);

if ($curlErrno) {
    die("Curl error: " . curl_error($ch));
}

curl_close($ch);

echo "<pre>";
var_dump($response);
echo "</pre>";
exit;  // This ensures the script stops here and only outputs the API response for debugging.

if (json_last_error() !== JSON_ERROR_NONE) {
    die("Failed to decode the response from the Monitoring API.");
}

$quotaLimit = 10000; // Replace this with your actual quota limit
$quotaUsed = 0;

if (isset($data['timeSeries'][0]['points'][0]['value']['int64Value'])) {
    $quotaUsed = $data['timeSeries'][0]['points'][0]['value']['int64Value'];
}

$percentageUsed = ($quotaUsed / $quotaLimit) * 100;

// Output the percentage used
echo json_encode(['percentageUsed' => $percentageUsed]);

?>
