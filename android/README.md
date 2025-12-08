# Android App Build Instructions

This Android app wraps the React web application for mobile deployment.

## Prerequisites

1. **Android Studio** installed with SDK 34
2. **Node.js** for building the React app
3. **Java 8+** for Android development

## Build Steps

### 1. Build the React App
```bash
npm run build
```

### 2. Copy React Build to Android Assets
```bash
# Copy the built React app to Android assets
copy dist\* android\app\src\main\assets\
```

### 3. Build the Android AAB
```bash
# Run the build script
build-android.bat
```

## Android Manifest Configuration

The Android manifest is configured specifically for handheld devices:

✅ **Included Features:**
- Optional telephony (works on tablets)
- Full screen size support (phones + tablets)
- Handheld app category
- Audio playback permissions
- Internet access for web content

❌ **Excluded Features:**
- No XR/VR support
- No TV support
- No Auto support
- No WearOS support
- No special form factors

## Target Devices

This AAB is compatible with:
- ✅ Pixel 7 and newer
- ✅ Samsung phones
- ✅ All Android tablets
- ✅ Chromebooks
- ✅ All handheld Android devices

## Key Configuration Details

- **Target SDK**: 34
- **Minimum SDK**: 21
- **Telephony**: Optional (false)
- **Screen Support**: All sizes (small, normal, large, xlarge)
- **App Category**: Handheld (`APP_HANDSET`)

## Publishing to Google Play

1. Use the generated AAB file: `android/app/build/outputs/bundle/release/app-release.aab`
2. Upload to Google Play Console
3. The app will be available for phones and tablets only
4. No special device exclusions needed