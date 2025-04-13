# PowerShell script to test NVIDIA Multimer API endpoints

# Test configuration
$apiBaseUrl = "http://localhost:3000/api/nvidia/multimer"
$validSequence = "MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG"
$invalidSequence = "INVALID123"
$multipleSequences = @(
    "MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG",
    "MSKVLVLGLGNIGSEVVKILALLDKIKDALKDVFHTSKLKGKPLVLNFWASWCVPCLRAKDLTK"
)
$longSequence = "A" * 2000 # Sequence that's too long
$timeoutDuration = 30 # seconds

# Helper function to make API requests
function Invoke-MultiFoldAPI {
    [CmdletBinding()]

    param (
        [string]$Endpoint,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $env:NVIDIA_MULTIMER_API_KEY"
    }

    $params = @{
        Uri = $Endpoint
        Method = $Method
        Headers = $headers
        TimeoutSec = $timeoutDuration
    }

    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json)
    }

    try {
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Data = $response
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = ""
        
        # Try to get detailed error message from response
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorResponse = $reader.ReadToEnd() | ConvertFrom-Json
            $errorMessage = if ($errorResponse.error) { $errorResponse.error } else { $errorResponse }
        }
        catch {
            # If can't parse JSON response, use the raw error message
            $errorMessage = $_.Exception.Message
        }

        return @{
            Success = $false
            StatusCode = $statusCode
            Error = $errorMessage
        }
    }
}

# Test 1: Submit valid sequence
Write-Host "\nTest 1: Submitting valid sequence..." -ForegroundColor Cyan
$result = Invoke-MultiFoldAPI -Endpoint $apiBaseUrl -Method "POST" -Body @{
    sequences = @($validSequence)
}

if ($result.Success) {
    Write-Host "Success! Request ID:" $result.Data.reqId -ForegroundColor Green
    $reqId = $result.Data.reqId

    # Poll for status if request was accepted
    if ($result.Data.status -eq "pending") {
        Write-Host "Polling for status..." -ForegroundColor Yellow
        do {
            Start-Sleep -Seconds 5
            $statusResult = Invoke-MultiFoldAPI -Endpoint "$apiBaseUrl/status/$reqId"
            Write-Host "Status:" $statusResult.Data.status -ForegroundColor Yellow
        } while ($statusResult.Success -and $statusResult.Data.status -eq "pending")

        if ($statusResult.Success -and $statusResult.Data.pdb) {
            Write-Host "Prediction completed successfully!" -ForegroundColor Green
        }
        else {
            Write-Host "Error during prediction:" $statusResult.Error -ForegroundColor Red
        }
    }
}
else {
    Write-Host "Error:" $result.Error -ForegroundColor Red
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Red
}

# Test 2: Submit invalid sequence
Write-Host "\nTest 2: Submitting invalid sequence..." -ForegroundColor Cyan
$result = Invoke-MultiFoldAPI -Endpoint $apiBaseUrl -Method "POST" -Body @{
    sequences = @($invalidSequence)
}

if (-not $result.Success) {
    Write-Host "Expected error received:" $result.Error -ForegroundColor Green
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Green
}
else {
    Write-Host "Unexpected success with invalid sequence" -ForegroundColor Red
}

# Test 3: Test with missing API key
Write-Host "\nTest 3: Testing with missing API key..." -ForegroundColor Cyan
$originalApiKey = $env:NVIDIA_MULTIMER_API_KEY
$env:NVIDIA_MULTIMER_API_KEY = $null
$result = Invoke-MultiFoldAPI -Endpoint $apiBaseUrl -Method "POST" -Body @{
    sequences = @($validSequence)
}

if (-not $result.Success -and $result.StatusCode -eq 401) {
    Write-Host "Expected error received for missing API key:" $result.Error -ForegroundColor Green
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Green
}
else {
    Write-Host "Unexpected response for missing API key test" -ForegroundColor Red
}

# Restore the original API key
$env:NVIDIA_MULTIMER_API_KEY = $originalApiKey

# Test 4: Test with multiple sequences
Write-Host "\nTest 4: Testing with multiple sequences..." -ForegroundColor Cyan
$result = Invoke-MultiFoldAPI -Endpoint $apiBaseUrl -Method "POST" -Body @{
    sequences = $multipleSequences
}

if ($result.Success) {
    Write-Host "Multiple sequences request accepted!" -ForegroundColor Green
    # Poll for status if needed
    if ($result.Data.status -eq "pending") {
        Write-Host "Polling for multiple sequences status..." -ForegroundColor Yellow
        $reqId = $result.Data.reqId
        do {
            Start-Sleep -Seconds 5
            $statusResult = Invoke-MultiFoldAPI -Endpoint "$apiBaseUrl/status/$reqId"
            Write-Host "Status:" $statusResult.Data.status -ForegroundColor Yellow
        } while ($statusResult.Success -and $statusResult.Data.status -eq "pending")

        if ($statusResult.Success -and $statusResult.Data.pdb) {
            Write-Host "Multiple sequences prediction completed successfully!" -ForegroundColor Green
        }
        else {
            Write-Host "Error during multiple sequences prediction:" $statusResult.Error -ForegroundColor Red
        }
    }
}
else {
    Write-Host "Error with multiple sequences:" $result.Error -ForegroundColor Red
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Red
}

# Test 5: Test with sequence that's too long
Write-Host "\nTest 5: Testing with too long sequence..." -ForegroundColor Cyan
# Ensure API key is set for this test
if (-not $env:NVIDIA_MULTIMER_API_KEY) {
    $env:NVIDIA_MULTIMER_API_KEY = $originalApiKey
}

$result = Invoke-MultiFoldAPI -Endpoint $apiBaseUrl -Method "POST" -Body @{
    sequences = @($longSequence)
}

if (-not $result.Success -and $result.StatusCode -eq 400) {
    Write-Host "Expected error received for too long sequence:" $result.Error -ForegroundColor Green
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Green
}
else {
    Write-Host "Unexpected response for too long sequence test" -ForegroundColor Red
}

# Test 6: Test timeout handling
Write-Host "\nTest 6: Testing timeout handling..." -ForegroundColor Cyan
# Ensure API key is set for this test
if (-not $env:NVIDIA_MULTIMER_API_KEY) {
    $env:NVIDIA_MULTIMER_API_KEY = $originalApiKey
}

$timeoutDuration = 1 # Set very short timeout
$result = Invoke-MultiFoldAPI -Endpoint $apiBaseUrl -Method "POST" -Body @{
    sequences = @($validSequence)
}

if (-not $result.Success -and ($result.Error -match "timeout" -or $result.StatusCode -eq 504)) {
    Write-Host "Expected timeout error received:" $result.Error -ForegroundColor Green
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Green
}
else {
    Write-Host "Unexpected response for timeout test" -ForegroundColor Red
}

Write-Host "\nAll tests completed!" -ForegroundColor Cyan