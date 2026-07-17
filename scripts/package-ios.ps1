param(
  [string]$Version = "0.0.0.1",
  [string]$Stage = "beta"
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PackageRoot = Join-Path $Root "build\ios\Shhebet-iOS-$Version-$Stage"
$ReleaseRoot = Join-Path $Root "ios"
$OutputName = "Shhebet-iOS-$Version-$Stage.zip"
$OutputZip = Join-Path $ReleaseRoot $OutputName

& node (Join-Path $Root "scripts\build-web.mjs")

Remove-Item $PackageRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $PackageRoot, $ReleaseRoot | Out-Null

Copy-Item (Join-Path $Root "platforms\ios\Shhebet.xcodeproj") $PackageRoot -Recurse -Force
Copy-Item (Join-Path $Root "platforms\ios\Shhebet") $PackageRoot -Recurse -Force
Copy-Item (Join-Path $Root "web") (Join-Path $PackageRoot "Shhebet\Web") -Recurse -Force
Copy-Item (Join-Path $Root "LICENSE") (Join-Path $PackageRoot "LICENSE") -Force
Copy-Item (Join-Path $Root "NOTICE") (Join-Path $PackageRoot "NOTICE") -Force

@"
Shhebet iOS $Version $Stage

Open Shhebet.xcodeproj in Xcode, select your Apple Team, then archive the
Release scheme to produce an IPA. This ZIP contains the Web bundle under
Shhebet/Web and does not require a Shhebet server.
"@ | Set-Content (Join-Path $PackageRoot "README-IOS.txt") -Encoding ASCII

Remove-Item $OutputZip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $PackageRoot "*") -DestinationPath $OutputZip -Force

$Hash = Get-FileHash $OutputZip -Algorithm SHA256
"$($Hash.Hash.ToLowerInvariant())  $OutputName" | Set-Content (Join-Path $ReleaseRoot "SHA256SUMS.txt") -Encoding ASCII

Write-Host "iOS Xcode ZIP packaged: $OutputZip"

