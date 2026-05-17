#!/bin/bash
set -e

SERVER_IP="${1:-192.168.1.100}"
echo "Building APK with server IP: $SERVER_IP"

export VITE_API_URL="http://$SERVER_IP:3001"
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk

npm run build
npx cap sync
cd android
./gradlew assembleDebug
cd ..

echo ""
echo "APK ready at: android/app/build/outputs/apk/debug/app-debug.apk"
echo "Size: $(ls -lh android/app/build/outputs/apk/debug/app-debug.apk | awk '{print $5}')"
echo ""
echo "To install, transfer to phone and open the APK."
echo "Or use: adb install android/app/build/outputs/apk/debug/app-debug.apk"
