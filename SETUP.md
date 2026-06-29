# GIF Player — Setup Guide

## Prerequisites

### 1. Node.js (v18 or later)
Download and install from https://nodejs.org

### 2. Rust
Install via rustup (https://rustup.rs):
```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
On Windows, download and run the rustup installer from the site above.

### 3. Tauri System Dependencies
Follow the Tauri v2 prerequisites guide for your OS:
https://tauri.app/start/prerequisites/

- **Windows**: Install Microsoft C++ Build Tools (via Visual Studio Installer → "Desktop development with C++") and ensure WebView2 is present (pre-installed on Windows 10/11 21H2+).
- **macOS**: Run `xcode-select --install` and install the Command Line Tools.
- **Linux**: Install `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `libssl-dev`, `libgtk-3-dev`, `librsvg2-dev` (exact package names vary by distro — see the Tauri docs).

---

## Configuration

### 1. Create Your `.env` File
Copy `.env.example` to `.env` and fill in your API keys:
```
cp .env.example .env
```
Then open `.env` and replace each placeholder with your actual key (see sections below).

### 2. Add Your Spotify Client ID
1. Go to https://developer.spotify.com/dashboard and sign in.
2. Create an app (or open an existing one).
3. Copy the **Client ID** and set it in `.env`:
```
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
```

### 3. Add Your Giphy API Key
1. Go to https://developers.giphy.com and sign up for a free account.
2. Create a new app to obtain an API key (choose "API", not "SDK").
3. Set it in `.env`:
```
VITE_GIPHY_API_KEY=your_actual_key_here
```
Without a key the app still runs but shows the idle image for every track.

### 4. Add Your Last.fm API Key (optional — genre fallback)
Last.fm is used as a fallback when Spotify returns no genre tags for an artist (~30–40% of tracks). Without it the app searches Giphy for "music" as a last resort.
1. Go to https://www.last.fm/api/account/create and create a free API account.
2. Copy the **API key** (not the secret) and set it in `.env`:
```
VITE_LASTFM_API_KEY=your_lastfm_key_here
```
If the key is missing or left as the placeholder, a console warning is logged and the app continues working normally.

### 5. Register the Redirect URI in Spotify Developer Dashboard
The PKCE flow redirects back to the app using a custom URI scheme (`spotifygif://callback`).
You must whitelist this URI in your Spotify app settings:

1. Go to https://developer.spotify.com/dashboard
2. Open the app with client ID `84b2a106838b4135b2ba33bbb0b24df5`
3. Click **Edit Settings**
4. Under **Redirect URIs**, add: `spotifygif://callback`
5. Save

### 6. Generate App Icons (required to build)
Replace the placeholder `src-tauri/icons/` directory with real icons. The easiest way is to run (after `npm install`):
```
npm run tauri icon path/to/your/image.png
```
This generates all required sizes from a single 1024×1024 PNG. Without valid icons, `tauri build` will fail.

### 7. Replace the Idle GIF (optional)
`public/idle.gif` is shown when Spotify is paused or closed. Replace it with any GIF you like.

---

## Running the App

```bash
# Install JS dependencies
npm install

# Start in development mode (Vite dev server + Tauri window)
npm run tauri dev
```

> **Windows note**: On the first `tauri dev`, Cargo downloads and compiles all Rust dependencies. This takes 5–10 minutes but is cached for subsequent runs.

---

## Building for Distribution

```bash
npm run tauri build
```

Output installers are placed in `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` and `.exe` (NSIS)
- **macOS**: `.dmg` and `.app`
- **Linux**: `.AppImage` and `.deb`

---

## Deep Link Behaviour by OS

| OS | During `tauri dev` | After install |
|----|-------------------|---------------|
| Windows | Scheme registered on first run via `register_all()` in Rust | Registered by installer |
| macOS | Works if app is the frontmost Tauri process | Registered via bundle `Info.plist` |
| Linux | Registered via `.desktop` file; may need `update-desktop-database` | Handled by package manager |

If deep links don't work during development, run the app once with `tauri dev`, then close it, then try the OAuth flow again — the OS sometimes needs one launch to register the scheme.

---

## Project Structure

```
Spotify-Gif-Player/
├── src/
│   ├── App.tsx               # Auth state machine, deep-link listener
│   ├── main.tsx
│   ├── views/
│   │   ├── LoginView.tsx     # "Connect Spotify" screen
│   │   └── PlayerView.tsx    # Fullscreen GIF + hover controls
│   ├── hooks/
│   │   ├── useSpotify.ts     # 750ms polling, genre detection, token refresh
│   │   └── useGiphy.ts       # GIF fetch, preload, crossfade
│   └── lib/
│       ├── auth.ts           # PKCE helpers, token exchange/refresh
│       ├── store.ts          # tauri-plugin-store wrappers (persistent token + track meta)
│       ├── spotify.ts        # Spotify API calls + genreFinder logic
│       ├── lastfm.ts         # Last.fm track.getTopTags (genre fallback)
│       └── giphy.ts          # Giphy REST API search + preload
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   └── lib.rs            # Plugin registration, deep-link scheme setup
│   ├── capabilities/
│   │   └── default.json      # Tauri v2 permission grants
│   ├── Cargo.toml
│   └── tauri.conf.json       # Window config, bundle targets, URI scheme
├── public/
│   └── idle.gif              # Shown when Spotify is paused/stopped
├── .env                      # API keys (not committed — copy from .env.example)
├── .env.example              # Template with all required key names
└── SETUP.md
```

---

## Auth Flow Summary

1. App starts → checks `tauri-plugin-store` for a stored `refresh_token`
2. If found → calls Spotify's token endpoint to get a fresh `access_token` silently → player loads
3. If not found → Login screen is shown
4. "Connect Spotify" → PKCE verifier/challenge generated → system browser opens Spotify OAuth URL
5. Spotify redirects to `spotifygif://callback?code=...` → Tauri intercepts → frontend extracts `code`
6. `code` + `code_verifier` exchanged for `access_token` + `refresh_token`
7. `refresh_token` stored in OS keychain via `tauri-plugin-store` → player loads
8. `access_token` lives in React state only (not persisted)
9. On 401 from any Spotify API call → silent refresh, retry once
