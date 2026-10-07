param(
    [string]$WebhookUrl = 'https://vietan-express.vercel.app/api/v1/ecom/webhooks/shopify'
)

# Only send missing/invalid signatures: these requests must never reach the data handlers.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(45)
$failures = 0
try {
    foreach ($topic in @('customers/data_request', 'customers/redact', 'shop/redact')) {
        foreach ($signatureCase in @('missing', 'invalid')) {
            $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $WebhookUrl)
            $response = $null
            try {
                $request.Content = [System.Net.Http.StringContent]::new('{}', [System.Text.Encoding]::UTF8, 'application/json')
                # .NET Framework otherwise adds Expect: 100-continue, which Vercel Edge can reject.
                $request.Headers.ExpectContinue = $false
                $request.Headers.Add('X-Shopify-Topic', $topic)
                $request.Headers.Add('X-Shopify-Shop-Domain', 'webhook-probe.myshopify.com')
                if ($signatureCase -eq 'invalid') {
                    # Valid base64 with the correct digest length, but deliberately not a real HMAC.
                    $request.Headers.Add('X-Shopify-Hmac-Sha256', [Convert]::ToBase64String([byte[]]::new(32)))
                }
                $response = $client.SendAsync($request).GetAwaiter().GetResult()
                $status = [int]$response.StatusCode
                if ($status -eq 401) {
                    Write-Output "PASS $topic / $signatureCase signature: HTTP 401"
                } else {
                    $failures++
                    Write-Output "FAIL $topic / $signatureCase signature: HTTP $status (expected 401)"
                    Write-Output ($response.Content.ReadAsStringAsync().GetAwaiter().GetResult())
                }
            } catch {
                $failures++
                Write-Output "FAIL $topic / $signatureCase signature: connection failed or timed out"
            } finally {
                if ($null -ne $response) { $response.Dispose() }
                $request.Dispose()
            }
        }
    }
} finally {
    $client.Dispose()
}
if ($failures -gt 0) {
    throw "$failures webhook checks failed. Check the URL, backend deployment, proxy and redirects."
}
Write-Output 'All 6 signature rejection checks passed. This does not verify Shopify subscriptions or the production client secret.'
