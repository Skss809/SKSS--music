# SKSS Music - APK Formation Guide (Android Studio)

To turn your **SKSS Music** web app into a native Android APK, the most reliable and modern method is using **Capacitor**. This allows you to wrap your Vite project into a native Android container.

## Prerequisites
1. **Node.js** installed on your computer.
2. **Android Studio** installed and configured.
3. Your SKSS Music project code downloaded locally.

---

## Step 1: Prepare the Web Project
First, ensure your project is built and ready.
```bash
npm install
npm run build
```
*This creates the `dist` folder which contains your production-ready web app.*

## Step 2: Add Capacitor to your Project
In your project root directory, run:
```bash
# Install Capacitor core and CLI
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init
```
*When prompted:*
- **App name:** SKSS Music
- **App ID:** com.skss.music (or your preferred unique ID)
- **Web directory:** dist

## Step 3: Add the Android Platform
```bash
# Install the Android platform package
npm install @capacitor/android

# Add the Android platform to your project
npx cap add android
```

## Step 4: Sync the Web Code to Android
Every time you make changes to your web code, you **must** build and sync it to the Android project before creating a new APK. We have provided a shortcut command for this:
```bash
npm run build:android
```
*This command runs both `npm run build` and `npx cap sync android`.*

## Step 5: Open in Android Studio
```bash
npx cap open android
```
*This will launch Android Studio and open the generated Android project.*

## Step 6: Build the APK in Android Studio
1. Wait for Android Studio to finish indexing and Gradle sync (this might take a few minutes).
2. In the top menu, go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Once finished, a notification will appear at the bottom right. Click **locate** to find your `app-debug.apk`.

---

## Pro Tips for a Better Mobile Experience:
- **Permissions:** If you want to access local files on the device (as requested in your concept), you may need to add permissions to your `AndroidManifest.xml` (located in `android/app/src/main/AndroidManifest.xml`):
  ```xml
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
  ```
- **Icons:** You can change the app icon by replacing the images in `android/app/src/main/res/mipmap`.
- **Splash Screen:** Use the `@capacitor/splash-screen` plugin to add a beautiful entrance to your app.

## Deployment to Vercel
Your project is already Vercel-friendly!
1. Push your code to GitHub.
2. Connect your GitHub repo to Vercel.
3. Vercel will automatically detect the Vite framework.
4. **Important:** Add your `GEMINI_API_KEY` in the Vercel Dashboard under **Project Settings > Environment Variables**.
