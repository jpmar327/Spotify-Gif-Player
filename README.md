# GIF Player

A cross-platform desktop app that listens to your Spotify playback, detects the genre of the current track, and displays a matching fullscreen GIF. Built with Tauri, React, and TypeScript.

![Platform support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)

---

## What it does

- Detects the genre of whatever is playing on Spotify using a multi-source pipeline (Last.fm → Spotify artist genres → fallback)
- Searches for a visually interesting GIF matching that genre and displays it fullscreen
- Preloads the next GIF in the background so it appears instantly on every track change
- Shows your idle image when Spotify is paused or not playing
- Stores your login securely in the OS keychain — log in once, stay logged in

## Controls

Hover anywhere on the fullscreen GIF to reveal the control overlay:

| Button | Action |
|--------|--------|
| ⏮ | Previous track |
| ⏯ | Play / Pause |
| ⏭ | Next track |
| ↻ | Rotate to a new GIF for the current genre |
| Start / Stop | Start or pause the GIF polling loop |
| ℹ | Open the track metadata panel |
| Logout | Disconnect your Spotify account |

## Track Metadata Panel

Click the ℹ button to open a panel showing:
- Track info (title, artist, album, popularity, duration)
- Audio features (energy, danceability, valence, tempo, and more)
- Audio analysis (key, time signature, section breakdown)
- Genre detection card showing the source (Last.fm or Spotify), all raw tags found, and the actual search phrase used to find the GIF
- Per-section raw JSON for each data source
- API call log for the current track with HTTP status, response time, and full response

## Genre detection

Genre is resolved in priority order:
1. **Last.fm** `track.getTopTags` — crowd-sourced track-level tags with 20+ years of data; most accurate for specific genres
2. **Spotify** artist genres — broader, but always available as a fallback
3. **"music visualizer"** — used as the Giphy search term if neither source returns a matchable genre

Genres matched include rap, hip hop, rock, alternative, country, trap, metal, jazz, r&b, pop, funk, edm, soul, punk, indie, folk, blues, reggae, classical, house, techno, drum and bass, k-pop, latin, gospel, ambient, disco, bachata, merengue, salsa, reggaeton, dembow, forró, pagode, samba, funk brasileiro, sertanejo, banda, corridos, norteño, and mariachi.

## GIF sources

- **Giphy** (primary) — searched with a visual phrase mapped from the detected genre (e.g. "edm" → "edm festival lights")
- **Klipy** (fallback) — used when Giphy returns fewer than 5 results for a genre

## Setup

See [SETUP.md](./SETUP.md) for full installation and configuration instructions.

**Required:**
- Spotify Developer app with `spotifygif://callback` as a Redirect URI
- Giphy API key

**Optional but recommended:**
- Last.fm API key (significantly improves genre accuracy)
- Klipy API key (improves GIF quality for niche genres)

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop wrapper | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Auth | Spotify OAuth 2.0 with PKCE (no client secret) |
| Token storage | OS keychain via `tauri-plugin-store` |
| Genre source 1 | Last.fm API (`track.getTopTags`) |
| Genre source 2 | Spotify Web API (artist genres) |
| GIF source 1 | Giphy REST API |
| GIF source 2 | Klipy API |

## Building

```bash
npm install
npm run tauri dev     # development
npm run tauri build   # production installers
```

Output: `.exe`/`.msi` (Windows), `.dmg`/`.app` (macOS), `.AppImage`/`.deb` (Linux)
