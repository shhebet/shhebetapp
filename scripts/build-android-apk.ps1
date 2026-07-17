param(
  [string]$Version = "0.0.0.1",
  [string]$Stage = "beta",
  [int]$VersionCode = 1
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Sdk = $env:ANDROID_HOME
if (-not $Sdk) { $Sdk = $env:ANDROID_SDK_ROOT }
if (-not $Sdk) { $Sdk = "C:\Users\zakha\AppData\Local\Android\Sdk" }
if (-not (Test-Path $Sdk)) { throw "Android SDK not found: $Sdk" }

$BuildTools = Get-ChildItem (Join-Path $Sdk "build-tools") -Directory |
  Sort-Object { [version]$_.Name } -Descending |
  Select-Object -First 1
if (-not $BuildTools) { throw "Android build-tools not found under $Sdk" }

$Platform = Join-Path $Sdk "platforms\android-36\android.jar"
if (-not (Test-Path $Platform)) { $Platform = Join-Path $Sdk "platforms\android-35\android.jar" }
if (-not (Test-Path $Platform)) { throw "android.jar not found" }

$JavaHome = $env:JAVA_HOME
if (-not $JavaHome -or -not (Test-Path (Join-Path $JavaHome "bin\javac.exe"))) {
  $JavaHome = "C:\Program Files\Java\jdk-17"
}
if (-not (Test-Path (Join-Path $JavaHome "bin\javac.exe"))) {
  $JavaHome = "C:\Program Files\Android\Android Studio\jbr"
}
if (-not (Test-Path (Join-Path $JavaHome "bin\javac.exe"))) { throw "JDK not found" }

$Aapt2 = Join-Path $BuildTools.FullName "aapt2.exe"
$D8 = Join-Path $BuildTools.FullName "d8.bat"
$Zipalign = Join-Path $BuildTools.FullName "zipalign.exe"
$Apksigner = Join-Path $BuildTools.FullName "apksigner.bat"
$Javac = Join-Path $JavaHome "bin\javac.exe"
$Jar = Join-Path $JavaHome "bin\jar.exe"
$Keytool = Join-Path $JavaHome "bin\keytool.exe"

$AndroidRoot = Join-Path $Root "platforms\android"
$BuildRoot = Join-Path $Root "build\android"
$GenRoot = Join-Path $BuildRoot "generated"
$ClassesRoot = Join-Path $BuildRoot "classes"
$DexRoot = Join-Path $BuildRoot "dex"
$AssetsRoot = Join-Path $BuildRoot "assets"
$ReleaseRoot = Join-Path $Root "android"

Remove-Item $BuildRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $GenRoot, $ClassesRoot, $DexRoot, $AssetsRoot, $ReleaseRoot | Out-Null

& node (Join-Path $Root "scripts\build-web.mjs")
Copy-Item (Join-Path $Root "web") (Join-Path $AssetsRoot "web") -Recurse -Force

$CompiledRes = Join-Path $BuildRoot "resources.zip"
& $Aapt2 compile --dir (Join-Path $AndroidRoot "res") -o $CompiledRes
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

$UnsignedApk = Join-Path $BuildRoot "unsigned.apk"
& $Aapt2 link `
  -I $Platform `
  --manifest (Join-Path $AndroidRoot "AndroidManifest.xml") `
  --java $GenRoot `
  --min-sdk-version 26 `
  --target-sdk-version 36 `
  --version-code $VersionCode `
  --version-name $Version `
  -A $AssetsRoot `
  --auto-add-overlay `
  -o $UnsignedApk `
  $CompiledRes
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

$JavaSources = @()
$JavaSources += Get-ChildItem (Join-Path $AndroidRoot "src") -Recurse -Filter "*.java" | ForEach-Object { $_.FullName }
$JavaSources += Get-ChildItem $GenRoot -Recurse -Filter "*.java" | ForEach-Object { $_.FullName }
$ArgFile = Join-Path $BuildRoot "javac.args"
$JavaSources | ForEach-Object { '"' + ($_.Replace('\', '/')) + '"' } | Set-Content $ArgFile -Encoding ASCII
& $Javac -source 11 -target 11 -classpath $Platform -d $ClassesRoot "@$ArgFile"
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

$ClassFiles = Get-ChildItem $ClassesRoot -Recurse -Filter "*.class" | ForEach-Object { $_.FullName }
& $D8 --lib $Platform --output $DexRoot $ClassFiles
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

& $Jar uf $UnsignedApk -C $DexRoot "classes.dex"
if ($LASTEXITCODE -ne 0) { throw "jar update failed" }

$AlignedApk = Join-Path $BuildRoot "aligned.apk"
& $Zipalign -f 4 $UnsignedApk $AlignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

$Keystore = Join-Path $BuildRoot "shhebet-local-release.jks"
& $Keytool -genkeypair `
  -keystore $Keystore `
  -storepass "changeit" `
  -keypass "changeit" `
  -alias "shhebet" `
  -keyalg "RSA" `
  -keysize 2048 `
  -validity 3650 `
  -dname "CN=Shhebet Local Release,O=Shhebet,C=US" `
  -noprompt
if ($LASTEXITCODE -ne 0) { throw "keytool failed" }

$OutputName = "Shhebet-$Version-$Stage.apk"
$OutputApk = Join-Path $ReleaseRoot $OutputName
& $Apksigner sign `
  --ks $Keystore `
  --ks-key-alias "shhebet" `
  --ks-pass "pass:changeit" `
  --key-pass "pass:changeit" `
  --v4-signing-enabled false `
  --out $OutputApk `
  $AlignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

& $Apksigner verify --print-certs $OutputApk
if ($LASTEXITCODE -ne 0) { throw "APK verification failed" }

$Hash = Get-FileHash $OutputApk -Algorithm SHA256
"$($Hash.Hash.ToLowerInvariant())  $OutputName" | Set-Content (Join-Path $ReleaseRoot "SHA256SUMS.txt") -Encoding ASCII

Write-Host "Android APK built: $OutputApk"
