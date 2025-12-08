#!/bin/bash

# Build script for iMedia Android App
# This script builds a fresh AAB with the correct settings for handheld devices only

echo "Building iMedia Android App AAB..."

# Clean previous builds
echo "Cleaning previous builds..."
cd android
./gradlew clean

# Build the AAB
echo "Building AAB with SDK 34, Min SDK 21..."
./gradlew bundleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ AAB build successful!"
    echo "AAB location: android/app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "This AAB is configured for:"
    echo "- Handheld devices only (phones + tablets)"
    echo "- No XR/VR/TV/Auto support"
    echo "- Optional telephony (works on tablets)"
    echo "- All screen sizes supported"
    echo "- SDK 34 target, minimum SDK 21"
else
    echo "❌ Build failed! Check the logs above."
    exit 1
fi