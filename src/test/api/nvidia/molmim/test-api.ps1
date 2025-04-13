# PowerShell script to test NVIDIA MolMIM API endpoints

# Test configuration
$apiBaseUrl = "https://health.api.nvidia.com/v1/biology/nvidia/molmim/generate"
$validSmiles = "[H][C@@]12Cc3c[nH]c4cccc(C1=C[C@H](NC(=O)N(CC)CC)CN2C)c34"
$invalidSmiles = "INVALID_SMILES"
$timeoutDuration = 30 # seconds

# Helper function to make API requests
function Invoke-MolMIMAPI {
    [CmdletBinding()]

    param (
        [string]$Method = "POST",
        [object]$Body = $null
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $env:NVIDIA_MOLMIM_API_KEY"
        "Accept" = "application/json"
    }

    $params = @{
        Uri = $apiBaseUrl
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
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorResponse = $reader.ReadToEnd() | ConvertFrom-Json
            $errorMessage = if ($errorResponse.error) { $errorResponse.error } else { $errorResponse }
            
            # Handle specific error cases
            if ($statusCode -eq 401) {
                $errorMessage = "Authentication failed. Please check your API key."
            }
            elseif ($statusCode -eq 400) {
                $errorMessage = "Invalid request parameters: $errorMessage"
            }
            elseif ($statusCode -eq 500) {
                $errorMessage = "Server error occurred: $errorMessage"
            }
        }
        catch {
            $errorMessage = $_.Exception.Message
            
            # Handle timeout specifically
            if ($errorMessage -match "The operation has timed out") {
                $errorMessage = "Request timed out after ${timeoutDuration} seconds"
                $statusCode = 504
            }
        }

        return @{
            Success = $false
            StatusCode = $statusCode
            Error = $errorMessage
        }
    }
}

# Test 1: Submit valid SMILES with default parameters
Write-Host "\nTest 1: Submitting valid SMILES with default parameters..." -ForegroundColor Cyan
$result = Invoke-MolMIMAPI -Method "POST" -Body @{
    algorithm = "CMA-ES"
    num_molecules = 30
    property_name = "QED"
    minimize = $false
    min_similarity = 0.3
    particles = 30
    iterations = 10
    smi = $validSmiles
}

if ($result.Success) {
    Write-Host "Success! Generated molecules:" -ForegroundColor Green
    $result.Data | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
}
else {
    Write-Host "Error:" $result.Error -ForegroundColor Red
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Red
}

# Test 2: Submit invalid SMILES
Write-Host "\nTest 2: Submitting invalid SMILES..." -ForegroundColor Cyan
$result = Invoke-MolMIMAPI -Method "POST" -Body @{
    algorithm = "CMA-ES"
    num_molecules = 30
    property_name = "QED"
    minimize = $false
    min_similarity = 0.3
    particles = 30
    iterations = 10
    smi = $invalidSmiles
}

if (-not $result.Success) {
    Write-Host "Expected error received:" $result.Error -ForegroundColor Green
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Green
}
else {
    Write-Host "Unexpected success with invalid SMILES" -ForegroundColor Red
}

# Test 3: Test with missing API key
Write-Host "\nTest 3: Testing with missing API key..." -ForegroundColor Cyan
$originalApiKey = $env:NVIDIA_MOLMIM_API_KEY
$env:NVIDIA_MOLMIM_API_KEY = $null
$result = Invoke-MolMIMAPI -Method "POST" -Body @{
    algorithm = "CMA-ES"
    num_molecules = 30
    property_name = "QED"
    minimize = $false
    min_similarity = 0.3
    particles = 30
    iterations = 10
    smi = $validSmiles
}

if (-not $result.Success -and $result.StatusCode -eq 401) {
    Write-Host "Expected error received for missing API key:" $result.Error -ForegroundColor Green
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Green
}
else {
    Write-Host "Unexpected response for missing API key test" -ForegroundColor Red
}

# Restore the original API key
$env:NVIDIA_MOLMIM_API_KEY = $originalApiKey

# Test 4: Test with invalid parameters
Write-Host "\nTest 4: Testing with invalid parameters..." -ForegroundColor Cyan
$result = Invoke-MolMIMAPI -Method "POST" -Body @{
    algorithm = "INVALID_ALGORITHM"
    num_molecules = -1
    property_name = "INVALID_PROPERTY"
    minimize = $false
    min_similarity = 2.0
    particles = 0
    iterations = 0
    smi = $validSmiles
}

if (-not $result.Success -and $result.StatusCode -eq 400) {
    Write-Host "Expected error received for invalid parameters:" $result.Error -ForegroundColor Green
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Green
}
else {
    Write-Host "Unexpected response for invalid parameters test" -ForegroundColor Red
}

# Test 5: Test timeout handling
Write-Host "\nTest 5: Testing timeout handling..." -ForegroundColor Cyan
$timeoutDuration = 1 # Set very short timeout
$result = Invoke-MolMIMAPI -Method "POST" -Body @{
    algorithm = "CMA-ES"
    num_molecules = 30
    property_name = "QED"
    minimize = $false
    min_similarity = 0.3
    particles = 30
    iterations = 10
    smi = $validSmiles
}

if (-not $result.Success -and ($result.Error -match "timeout" -or $result.StatusCode -eq 504)) {
    Write-Host "Expected timeout error received:" $result.Error -ForegroundColor Green
    Write-Host "Status Code:" $result.StatusCode -ForegroundColor Green
}
else {
    Write-Host "Unexpected response for timeout test" -ForegroundColor Red
}

Write-Host "\nAll tests completed!" -ForegroundColor Cyan