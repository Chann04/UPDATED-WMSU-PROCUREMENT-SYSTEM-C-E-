# Build WMSU Procurement App as APK (EAS Build)

Use **EAS Build** (Expo Application Services) to produce an Android APK you can install on devices or share.

---

## 1. Prerequisites

- **Node.js** and **npm** installed.
- **Expo account** (free): [https://expo.dev/signup](https://expo.dev/signup).
- **EAS CLI** installed globally:
  ```bash
  npm install -g eas-cli
  ```

---

## 2. Log in and configure the project

From the **App** folder:

```bash
cd App
eas login
eas build:configure
```

- `eas login`: sign in with your Expo account.
- `eas build:configure`: ensures the project is linked to EAS (creates/updates `eas.json`; we already added an APK profile).

---

## 3. Set Supabase env for the build (required)

The app needs Supabase URL and anon key at **build time**. Set them as EAS secrets:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL    --value "https://YOUR_PROJECT.supabase.co"   --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY"                    --scope project
```

Use the same values as your web app (e.g. from `frontend/.env` or Supabase Dashboard → Project Settings → API).

---

## 4. Build the APK

From the **App** folder:

```bash
eas build --platform android --profile preview
```

- **preview** profile is set in `eas.json` to output an **APK** (`buildType: "apk"`).
- First run may ask to create a new Android keystore; choose **Yes** so EAS can sign the app.
- Build runs in the cloud. When it finishes, EAS shows a link to the **APK** and a QR code.

---

## 5. Download and install the APK

1. Open the build page (link from the terminal or [expo.dev](https://expo.dev) → your project → Builds).
2. Download the **APK**.
3. On an Android device: enable **Install from unknown sources** for your browser or file manager, then open the APK and install.

---

## Optional

- **Production APK** (same format, different profile):  
  `eas build --platform android --profile production`
- **Non-interactive** (e.g. in CI):  
  `eas build --platform android --profile preview --non-interactive`
- **Local build** (no EAS): possible with `expo prebuild` and Android Studio/Gradle, but EAS is the recommended way for APK.

---

## Quick checklist

- [ ] `cd App` and run `eas login` and `eas build:configure`
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` with `eas secret:create`
- [ ] Run `eas build --platform android --profile preview`
- [ ] Download APK from the build page and install on device
