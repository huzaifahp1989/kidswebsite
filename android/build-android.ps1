Param(
    [string]$Configuration = "Release"
)

Write-Host "Building Android App Bundle ($Configuration)..."

Set-Location "$PSScriptRoot\app"

if (Test-Path "$PSScriptRoot\gradlew.bat") {
    & "$PSScriptRoot\gradlew.bat" clean
    & "$PSScriptRoot\gradlew.bat" :app:bundle$Configuration
} else {
    Write-Host "Gradle wrapper not found. Open the 'android' folder in Android Studio and run 'Build > Generate Signed Bundle/APK...'"
    exit 1
}

Write-Host "AAB output: app\\build\\outputs\\bundle\\$($Configuration.ToLower())\\app-$($Configuration.ToLower()).aab"
