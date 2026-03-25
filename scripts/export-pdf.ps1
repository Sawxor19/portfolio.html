param(
  [string]$OutputDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not $OutputDir) {
  $OutputDir = Join-Path $projectRoot "pdf"
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$OutputDir = (Resolve-Path $OutputDir).Path

$edgeCandidates = @(
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

$edgePath = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $edgePath) {
  throw "Could not find Microsoft Edge or Google Chrome."
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()
$tempDir = $null

$serverProcess = Start-Process -FilePath "python" `
  -ArgumentList "-m", "http.server", $port, "--bind", "127.0.0.1" `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -PassThru

function Wait-ForServer {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 10
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 300
    }
  }

  throw "Local HTTP server did not start in time."
}

function Ensure-PyPdf {
  & python -c "import pypdf" 2>$null | Out-Null

  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Output "Installing pypdf..."
  & python -m pip install --user pypdf | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "Could not install pypdf."
  }
}

try {
  Wait-ForServer -Url "http://127.0.0.1:$port/index.html?pdf=1"
  Ensure-PyPdf

  $tempDir = Join-Path $OutputDir "_parts"

  if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
  }

  New-Item -ItemType Directory -Path $tempDir | Out-Null

  $jobs = @(
    @{
      Source = "index.html"
      Output = "victor-hugo-sanches-portfolio-pt.pdf"
      Sections = @("sobre", "projetos", "skills", "contato")
      Prefix = "pt"
    },
    @{
      Source = "index-en.html"
      Output = "victor-hugo-sanches-portfolio-en.pdf"
      Sections = @("about", "projects", "skills", "contact")
      Prefix = "en"
    }
  )

  foreach ($job in $jobs) {
    $targetFile = Join-Path $OutputDir $job.Output
    $partFiles = @()

    foreach ($section in $job.Sections) {
      $sourceUrl = "http://127.0.0.1:$port/$($job.Source)?pdf=1&section=$section"
      $partFile = Join-Path $tempDir "$($job.Prefix)-$section.pdf"
      $partFiles += $partFile

      $edgeProcess = Start-Process -FilePath $edgePath `
        -ArgumentList @(
        "--headless=new",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=8000",
        "--no-pdf-header-footer",
        "--print-to-pdf=""$partFile""",
        $sourceUrl
        ) `
        -WindowStyle Hidden `
        -PassThru `
        -Wait

      if ($edgeProcess.ExitCode -ne 0 -or -not (Test-Path $partFile)) {
        throw "PDF export failed for $($job.Source) [$section]."
      }
    }

    if (Test-Path $targetFile) {
      Remove-Item -Path $targetFile -Force
    }

    @'
from pathlib import Path
from pypdf import PdfWriter
import sys

output = Path(sys.argv[1])
parts = [Path(part) for part in sys.argv[2:]]

writer = PdfWriter()
for part in parts:
    writer.append(str(part))

with output.open("wb") as stream:
    writer.write(stream)
'@ | python - $targetFile @partFiles | Out-Null

    if (-not (Test-Path $targetFile)) {
      throw "PDF merge failed for $($job.Source)."
    }

    Write-Output "Created $targetFile"
  }

  if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
  }
}
finally {
  if ($tempDir -and (Test-Path $tempDir)) {
    Remove-Item -Path $tempDir -Recurse -Force
  }

  if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
  }
}
