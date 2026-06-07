# 🚀 Android Fresh Start Guide (SKSS Music)

Follow these steps exactly to avoid "File Locked" errors and set up your app successfully.

## 1. Preparation
1. Export this project from AI Studio as a **ZIP**.
2. Extract the ZIP to a **clean folder** on your computer.
3. Open your command tool (CMD or PowerShell) in that folder.
4. Run: `npm install`
5. **CRITICAL:** Run `npm run build` (This creates the `dist` folder).
6. Run: `npx cap add android`

## 2. Setting the Icon & Splash
1. Create a folder named **`assets`** in this main folder.
2. Put your image `photo_2026-05-03_16-47-12.jpg` in there.
3. **Rename** it to `splash.png`.
4. Run: `npx capacitor-assets generate --android`
5. Run: `npx cap sync android`

## 3. Building the App
1. Run: `npm run build`
2. Run: `npx cap copy`
3. Launch Android Studio and click **Open**. Navigate to your project folder and select the **`android` folder** inside it (do not just open the main project folder).

## 4. Finalizing in Android Studio
1. **The Name**: "SKSS Music" is already set in the code!
2. **If you don't see the Elephant Icon**:
   - In the top menu, click **File > Sync Project with Gradle Files**.
   - This usually happens if you didn't open the `android` folder specifically.
3. **The Icon**: 
   - Right-click `app` > New > Image Asset.
   - For "Path", click the folder icon and find your `assets/splash.png`.
   - Click Finish.
4. **Generate the APK**:
   - Go to the top menu bar. Click **Build**.
   - Select **Build Bundle(s) / APK(s)**.
   - Click **Build APK(s)**.
   - A notification will appear in the bottom right when done. Click **locate** to find your file!

---

**Troubleshooting "Elephant Icon" still missing:**
- Make sure Android Studio is finished indexing (check the bottom right for any progress bars).
- Ensure you chose **Open** and selected the folder named **`android`**.
- If it still doesn't appear, go to **File > Invalidate Caches...**, check all boxes, and click **Clear and Restart**.
