# Connect Expo Go to the dev server

If you see **"Could not connect to development server"** in Expo Go, follow these steps.

## 1. Start the dev server (on your computer)

From this folder (`App`), run:

```bash
cd C:\Users\utohb\Desktop\PROCUREMENT-SYSTEM-main\App
npm start
```

Or: `npx expo start`

Leave this terminal open while you use Expo Go.

---

## 2. Choose how to connect

### Option A: Same Wi‑Fi (LAN)

- Phone and computer must be on the **same Wi‑Fi network**.
- In the terminal, a **QR code** appears. Scan it with the **Camera** app (iOS) or **Expo Go** (Android).
- If it still fails, your firewall may be blocking the connection (see step 3).

### Option B: Tunnel (works across different networks)

If you’re on different Wi‑Fi or LAN doesn’t work, use tunnel:

```bash
cd C:\Users\utohb\Desktop\PROCUREMENT-SYSTEM-main\App
npm run start:tunnel
```

Or: `npx expo start --tunnel`

- Wait until it says “Tunnel ready” and shows a QR code.
- Scan the **new** QR code with Expo Go. The app will load the bundle via the internet.

---

## 3. Windows Firewall

If you use LAN (Option A) and it still doesn’t connect:

- When you run `npm start`, Windows may show a “Firewall” popup.
- Check **Private networks** (and **Public** if you need it), then click **Allow access**.
- Try scanning the QR code again.

---

## 4. Quick checklist

- [ ] Dev server is running (`npm start` or `npm run start:tunnel`).
- [ ] You’re in the `App` folder when you run the command.
- [ ] For LAN: phone and PC on same Wi‑Fi.
- [ ] For tunnel: use `npm run start:tunnel` and scan the tunnel QR code.
- [ ] If on Windows: allow Node in the firewall when prompted.
