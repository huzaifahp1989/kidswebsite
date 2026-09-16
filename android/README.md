# Android App Build Instructions

This Android app wraps the React web application for mobile deployment.

## Prerequisites

1. **Android Studio** installed with SDK 36
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

- **Target SDK**: 36
- **Minimum SDK**: 23 (required for OneSignal SDK 5.x)
- **Telephony**: Optional (false)
- **Screen Support**: All sizes (small, normal, large, xlarge)
- **App Category**: Handheld (`APP_HANDSET`)

## OneSignal push notifications

The Android app includes the **OneSignal Android SDK** for native push.

### 1. Firebase setup (required for delivery)

1. Open [Firebase Console](https://console.firebase.google.com/) → project `push-notification-78356`
2. Add Android app with package name **`com.imedia.app`**
3. Download **`google-services.json`**
4. Save it as:
   ```
   android/app/google-services.json
   ```
   (See `google-services.json.example` for the expected format.)

### 2. OneSignal dashboard

1. [OneSignal](https://onesignal.com) → your app
2. **Settings → Platforms → Google Android (FCM)**
3. Upload Firebase **service account JSON**
4. App ID used in code: `daf8fc36-781a-417d-8ee4-5078635f22e7`

### 3. Build in Android Studio

1. Open the **`android/`** folder in Android Studio
2. **File → Sync Project with Gradle Files**
3. Build → **Generate Signed Bundle / APK**
4. Install on a real device and send a test push from OneSignal

Push will not deliver until both `google-services.json` is in place and FCM is linked in OneSignal.

## Publishing to Google Play

1. Use the generated AAB file: `android/app/build/outputs/bundle/release/app-release.aab`
2. Upload to Google Play Console
3. The app will be available for phones and tablets only
4. No special device exclusions needed