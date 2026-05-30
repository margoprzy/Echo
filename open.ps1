# Echo launcher: starts dev server and opens Chrome on the right side
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$port = 3000
$url  = "http://localhost:$port"

# Start dev server if not already running
$busy = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if (-not $busy) {
    Write-Host "Starting Echo dev server..." -ForegroundColor Cyan
    Start-Process -FilePath "C:\Program Files\nodejs\npm.cmd" `
        -ArgumentList "run", "dev" `
        -WorkingDirectory $PSScriptRoot `
        -WindowStyle Minimized
    $deadline = (Get-Date).AddSeconds(15)
    while (-not (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue)) {
        if ((Get-Date) -gt $deadline) { Write-Host "Server timeout." -ForegroundColor Red; exit 1 }
        Start-Sleep -Milliseconds 300
    }
    Start-Sleep -Milliseconds 600
} else {
    Write-Host "Dev server already running on :$port" -ForegroundColor Green
}

# Open Chrome app-mode window on the right side of the screen
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$w = 430
$h = $screen.Height
$x = $screen.Width - $w
$y = 0

$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($chrome) {
    Start-Process $chrome "--app=$url --window-position=$x,$y --window-size=$w,$h"
    Write-Host "Echo opened at ${x},${y} (${w}x${h})" -ForegroundColor Green
} else {
    Start-Process $url
    Write-Host "Chrome not found - opened in default browser" -ForegroundColor Yellow
}
