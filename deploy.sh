#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
APK_SRC="$PROJECT_DIR/android-apk-dev/app/build/outputs/apk/debug/app-debug.apk"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
APK_NAME="${TIMESTAMP}_AIToolForWeb-debug.apk"

NEXTCLOUD_DEST="/Volumes/Files/Nextcloud/WebbyPage/Documents/Projects/MyApps-Development"
PUBLIC_DEST="$HOME/.opencode-dashboard/aitool-latest.apk"

echo "=== AI Tool For Web APK Deploy ==="
echo "Source: $APK_SRC"
echo ""

# 1. Build the APK
echo "[1/4] Building debug APK..."
cd "$PROJECT_DIR/android-apk-dev"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew assembleDebug
echo "  ✓ Build complete"

# 2. Verify APK exists
echo "[2/4] Verifying APK..."
if [ ! -f "$APK_SRC" ]; then
    echo "  ✗ APK not found at $APK_SRC"
    exit 1
fi
APK_SIZE=$(du -h "$APK_SRC" | cut -f1)
echo "  ✓ APK size: $APK_SIZE"

# 3. Copy to Nextcloud
echo "[3/4] Deploying to Nextcloud..."
if [ -d "$NEXTCLOUD_DEST" ]; then
    rm -f "$NEXTCLOUD_DEST"/*_AIToolForWeb-*.apk
    cp "$APK_SRC" "$NEXTCLOUD_DEST/$APK_NAME"
    echo "  ✓ Copied to $NEXTCLOUD_DEST/$APK_NAME"
else
    echo "  ⚠ Nextcloud destination not found at $NEXTCLOUD_DEST"
fi

# 4. Copy to dashboard public folder
echo "[4/4] Deploying to dashboard..."
mkdir -p "$(dirname "$PUBLIC_DEST")"
cp "$APK_SRC" "$PUBLIC_DEST"
echo "  ✓ Copied to $PUBLIC_DEST"

echo ""
echo "=== Deploy complete ==="
