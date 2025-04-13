$ErrorActionPreference = "Stop"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Load environment variables from .env.local
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^(?!#)(.+)=(.+)') {
            $name = $matches[1]
            $value = $matches[2].Trim('"').Trim("'")
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

# Check if NVCF_RUN_KEY is set
if (-not $env:NVCF_RUN_KEY) {
    Write-Error "Error: NVCF_RUN_KEY is not set in .env.local"
    exit 1
}

Write-Host "API Key found: $($env:NVCF_RUN_KEY.Substring(0,10))..."

$URL = "https://health.api.nvidia.com/v1/biology/nvidia/molmim/generate"

Write-Host "Testing NVIDIA API connection..."
Write-Host "Using endpoint: $URL"

# Test payload with minimal configuration
$requestBody = @{
    smi = "[H][C@@]12Cc3c[nH]c4cccc(C1=C[C@H](NC(=O)N(CC)CC)CN2C)c34"
    algorithm = "CMA-ES"
    num_molecules = 5
    property_name = "QED"
    minimize = $false
    min_similarity = 0.3
    particles = 30
    iterations = 10
} | ConvertTo-Json

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $($env:NVCF_RUN_KEY)"
        "Accept" = "application/json"
    }

    Write-Host "Sending request..."
    
    # Set timeout to 30 seconds
    $timeoutSec = 30
    
    $response = Invoke-WebRequest -Uri $URL -Method Post -Headers $headers -Body $requestBody -TimeoutSec $timeoutSec -ErrorAction Stop
    
    Write-Host "Response Status Code: $($response.StatusCode)"
    Write-Host "Response Headers:"
    $response.Headers | Format-Table -AutoSize
    
    Write-Host "Response Content:"
    $response.Content

    Write-Host "API connection test completed successfully!"
}
catch {
    Write-Error "Request failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "Status Code: $statusCode"
        Write-Host "Status Description: $statusDescription"
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody"
            $reader.Close()
        }
        catch {
            Write-Host "Could not read response body: $($_.Exception.Message)"
        }
    }
    exit 1
}