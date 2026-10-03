param(
    [string]$ApiBase = 'https://vietanexpress.onrender.com',
    [string]$WebBase = 'https://vietan-express.vercel.app',
    [string]$ExpectedRevision
)

$ErrorActionPreference = 'Stop'
$ApiBase = $ApiBase.TrimEnd('/')
$WebBase = $WebBase.TrimEnd('/')
$passed = 0

function Test-Http {
    param([string]$Name, [string]$Url, [int]$ExpectedStatus, [string]$Method = 'GET',
        [string]$Body, [scriptblock]$Check)
    $options = @{ Uri = $Url; Method = $Method; UseBasicParsing = $true; TimeoutSec = 45 }
    if ($PSBoundParameters.ContainsKey('Body')) {
        $options.Body = $Body
        $options.ContentType = 'application/json'
    }
    try {
        $response = Invoke-WebRequest @options
        $status = [int]$response.StatusCode
        $content = $response.Content
        $headers = $response.Headers
    } catch {
        if ($null -eq $_.Exception.Response) { throw "$Name : request failed" }
        $status = [int]$_.Exception.Response.StatusCode
        $content = $_.ErrorDetails.Message
        $headers = $_.Exception.Response.Headers
    }
    if ($status -ne $ExpectedStatus) { throw "$Name : expected HTTP $ExpectedStatus, received $status" }
    if ($Check -and !(& $Check $content $headers)) { throw "$Name : response contract failed" }
    $script:passed++
    Write-Output "PASS $Name (HTTP $status)"
}

Test-Http 'Render health and deployed revision' "$ApiBase/health" 200 -Check {
    param($content, $headers)
    $content.Trim() -eq 'Healthy' -and (!$ExpectedRevision -or $headers['X-Vietan-Revision'] -eq $ExpectedRevision)
}
Test-Http 'Frontend login page' "$WebBase/login" 200 -Check { param($content) $content -match '<html' }

$missingBill = 'QA-NOT-FOUND-' + [guid]::NewGuid().ToString('N').ToUpperInvariant()
$trackingBody = @{ bills = @($missingBill) } | ConvertTo-Json -Compress
$tooMany = @{ bills = @(1..11 | ForEach-Object { "$missingBill-$_" }) } | ConvertTo-Json -Compress
foreach ($base in @($ApiBase, $WebBase)) {
    Test-Http "Anonymous session at $base" "$base/api/v1/me" 401
    Test-Http "Orders require login at $base" "$base/api/v1/orders" 401
    Test-Http "Missing bill lookup at $base" "$base/api/v1/public/tracking" 200 -Method POST -Body $trackingBody -Check {
        param($content)
        $result = $content | ConvertFrom-Json
        $result.success -eq $true -and $result.data.Count -eq 1 -and $result.data[0].bill -eq $missingBill -and $result.data[0].found -eq $false
    }
    Test-Http "Empty tracking input at $base" "$base/api/v1/public/tracking" 200 -Method POST -Body '{"bills":[]}' -Check {
        param($content)
        $result = $content | ConvertFrom-Json
        $result.success -eq $true -and $result.data.Count -eq 0
    }
    Test-Http "Tracking batch limit at $base" "$base/api/v1/public/tracking" 400 -Method POST -Body $tooMany
}
Write-Output "$passed published checks passed. Authenticated customer workflows require a separate test account."
