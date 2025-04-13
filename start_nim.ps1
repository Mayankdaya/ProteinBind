# Check if NGC_CLI_API_KEY is set
if (-not $env:NGC_CLI_API_KEY) {
    Write-Host "Error: NGC_CLI_API_KEY environment variable is not set"
    Write-Host "Please set it first using:"
    Write-Host '$env:NGC_CLI_API_KEY = "your-key-here"'
    exit 1
}

# Set up cache directory
$cacheDir = "$env:USERPROFILE\.cache\nim"
if (-not (Test-Path $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir -Force
    Write-Host "Created cache directory at: $cacheDir"
}

# Ensure cache directory has proper permissions
icacls $cacheDir /grant:r "Users:(OI)(CI)F" /T

# Run the NIM container
Write-Host "Starting NIM container..."
docker run -it --rm `
    --runtime=nvidia `
    -p 8000:8000 `
    -e NGC_CLI_API_KEY=$env:NGC_CLI_API_KEY `
    -v ${cacheDir}:/opt/nim/.cache `
    nvcr.io/nim/deepmind/alphafold2-multimer:1.0.0