import { loggedFetch } from './apiLogger';

// Strips accents/diacritics so "forró" and "forro" both match the same
// GENRE_LIST entry. Applied to both GENRE_LIST values and incoming tags
// before comparison.
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Each genre has a canonical key (used everywhere else in the app — search
// terms, UI display, etc.) plus a list of alias substrings that real-world
// Last.fm/Spotify tags actually use. ALL aliases are checked when matching;
// the canonical key itself is always included as an alias automatically.
const GENRE_DEFINITIONS = {
  'rap':             { aliases: ['rap'] },
  'hip hop':         { aliases: ['hip hop', 'hiphop', 'hip-hop'] },
  'rock':            { aliases: ['rock'] },
  'alternative':     { aliases: ['alternative', 'alt rock'] },
  'country':         { aliases: ['country'] },
  'trap':            { aliases: ['trap'] },
  'metal':           { aliases: ['metal'] },
  'jazz':            { aliases: ['jazz'] },
  'r&b':             { aliases: ['r&b', 'rnb', 'r and b'] },
  'pop':             { aliases: ['pop'] },
  'funk':            { aliases: ['funk', 'p-funk', 'funk rock'] },
  'edm':             { aliases: ['edm', 'electronic dance music', 'electronica', 'dance'] },
  'soul':            { aliases: ['soul'] },
  'punk':            { aliases: ['punk', 'post-punk', 'post punk'] },
  'indie':           { aliases: ['indie'] },
  'folk':            { aliases: ['folk'] },
  'blues':           { aliases: ['blues'] },
  'reggae':          { aliases: ['reggae'] },
  'classical':       { aliases: ['classical'] },
  'house':           { aliases: ['house'] },
  'techno':          { aliases: ['techno'] },
  'drum and bass':   { aliases: ['drum and bass', 'dnb', 'drum & bass', 'jungle'] },
  'k-pop':           { aliases: ['k-pop', 'kpop', 'korean pop'] },
  'latin':           { aliases: ['latin', 'latino', 'latin pop'] },
  'gospel':          { aliases: ['gospel'] },
  'ambient':         { aliases: ['ambient'] },
  'disco':           { aliases: ['disco'] },

  // Latin / Caribbean
  'bachata':         { aliases: ['bachata'] },
  'merengue':        { aliases: ['merengue'] },
  'salsa':           { aliases: ['salsa'] },
  'reggaeton':       { aliases: ['reggaeton', 'reggaeton urbano'] },
  'dembow':          { aliases: ['dembow'] },

  // Brazilian — the canonical key stays 'funk brasileiro' so UI/search terms
  // are unaffected, but it now also matches the real-world tag spellings
  // that were previously falling through to plain 'funk'.
  'forro':           { aliases: ['forro', 'forró'] },
  'pagode':          { aliases: ['pagode'] },
  'samba':           { aliases: ['samba'] },
  'funk brasileiro': {
    aliases: [
      'funk brasileiro', 'funk carioca', 'brazilian funk',
      'baile funk', 'funk ostentacao', 'funk ostentação',
      'funk 150', 'funk mtg', 'mandelao', 'mandelão',
    ],
  },
  'sertanejo':       { aliases: ['sertanejo'] },

  // Regional Mexican
  'banda':           { aliases: ['banda'] },
  'corridos':        { aliases: ['corridos', 'corridos tumbados'] },
  'norteno':         { aliases: ['norteno', 'norteño'] },
  'mariachi':        { aliases: ['mariachi'] },
} as const;

type Genre = keyof typeof GENRE_DEFINITIONS;

const GENRE_LIST = Object.keys(GENRE_DEFINITIONS) as Genre[];

export interface NowPlaying {
  trackId: string;
  trackName: string;
  artistId: string;
  artistName: string;
  albumId: string;
  albumName: string;
  albumArt: string;
  albumReleaseDate: string;
  isPlaying: boolean;
  durationMs: number;
  progressMs: number;
  externalUrl: string;
  popularity: number;
  trackNumber: number;
  explicit: boolean;
}

// Build a flat list of { genre, alias } pairs, sorted by alias length
// descending — so the most specific alias (e.g. "funk carioca") is checked
// before a shorter generic one (e.g. "funk") and claims the tag first.
const SORTED_ALIAS_PAIRS: Array<{ genre: Genre; alias: string }> = GENRE_LIST
  .flatMap((genre) =>
    GENRE_DEFINITIONS[genre].aliases.map((alias) => ({ genre, alias: normalize(alias) }))
  )
  .sort((a, b) => b.alias.length - a.alias.length);

export function genreFinder(genreArray: string[]): Genre | undefined {
  if (genreArray.length === 0) return undefined;

  const normalizedTags = genreArray.map(normalize);
  const frequency: Record<string, number> = {};
  for (const g of GENRE_LIST) frequency[g] = 0;

  const claimedTagIndices = new Set<number>();

  for (const { genre, alias } of SORTED_ALIAS_PAIRS) {
    normalizedTags.forEach((tag, i) => {
      if (claimedTagIndices.has(i)) return; // tag already matched a more specific alias
      if (tag.includes(alias)) {
        frequency[genre]++;
        claimedTagIndices.add(i);
      }
    });
  }

  let topGenre: Genre | undefined;
  let topCount = 0;
  for (const genre of GENRE_LIST) {
    if (frequency[genre] > topCount) {
      topCount = frequency[genre];
      topGenre = genre;
    }
  }

  return topGenre;
}

export async function getCurrentlyPlaying(accessToken: string): Promise<NowPlaying | null> {
  const res = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 204 || res.status === 202) return null;
  if (!res.ok) throw Object.assign(new Error(`Spotify error: ${res.status}`), { status: res.status });

  const data = (await res.json()) as {
    is_playing: boolean;
    progress_ms: number;
    item: {
      id: string;
      name: string;
      explicit: boolean;
      popularity: number;
      track_number: number;
      duration_ms: number;
      external_urls: { spotify: string };
      artists: Array<{ id: string; name: string }>;
      album: {
        id: string;
        name: string;
        release_date: string;
        images: Array<{ url: string }>;
      };
    } | null;
  };

  if (!data.item) return null; // nothing queued; return paused tracks so UI can show track info

  return {
    trackId: data.item.id,
    trackName: data.item.name,
    artistId: data.item.artists[0].id,
    artistName: data.item.artists.map((a) => a.name).join(', '),
    albumId: data.item.album.id,
    albumName: data.item.album.name,
    albumArt: data.item.album.images[0]?.url ?? '',
    albumReleaseDate: data.item.album.release_date ?? '',
    isPlaying: data.is_playing,
    durationMs: data.item.duration_ms,
    progressMs: data.progress_ms ?? 0,
    externalUrl: data.item.external_urls?.spotify ?? '',
    popularity: data.item.popularity ?? 0,
    trackNumber: data.item.track_number ?? 0,
    explicit: data.item.explicit ?? false,
  };
}

export interface AudioFeatures {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  key: number;       // -1 = no key detected, 0–11 = pitch class
  liveness: number;
  loudness: number;  // dB, typically -60 to 0
  mode: number;      // 0 = minor, 1 = major
  speechiness: number;
  tempo: number;     // BPM
  time_signature: number;
  valence: number;
}

export async function getAudioFeatures(trackId: string, accessToken: string): Promise<AudioFeatures | null> {
  const res = await loggedFetch(
    'Spotify GET /audio-features/{id}',
    `https://api.spotify.com/v1/audio-features/${trackId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  return (await res.json()) as AudioFeatures;
}

export interface AudioAnalysisSection {
  start: number;
  duration: number;
  confidence: number;
  loudness: number;
  tempo: number;
  tempo_confidence: number;
  key: number;
  key_confidence: number;
  mode: number;
  mode_confidence: number;
  time_signature: number;
  time_signature_confidence: number;
}

export interface AudioAnalysis {
  track: {
    duration: number;
    end_of_fade_in: number;
    start_of_fade_out: number;
    loudness: number;
    tempo: number;
    tempo_confidence: number;
    time_signature: number;
    time_signature_confidence: number;
    key: number;
    key_confidence: number;
    mode: number;
    mode_confidence: number;
    num_samples: number;
    analysis_sample_rate: number;
  };
  counts: {
    bars: number;
    beats: number;
    tatums: number;
    sections: number;
    segments: number;
  };
  sections: AudioAnalysisSection[];
}

export async function getAudioAnalysis(trackId: string, accessToken: string): Promise<AudioAnalysis | null> {
  const res = await loggedFetch(
    'Spotify GET /audio-analysis/{id}',
    `https://api.spotify.com/v1/audio-analysis/${trackId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;

  const raw = (await res.json()) as {
    track: AudioAnalysis['track'];
    bars: unknown[];
    beats: unknown[];
    tatums: unknown[];
    sections: AudioAnalysisSection[];
    segments: unknown[];
  };

  // Strip the raw segments array (hundreds of entries, not visualisable) — keep only the count.
  return {
    track: raw.track,
    counts: {
      bars:     raw.bars.length,
      beats:    raw.beats.length,
      tatums:   raw.tatums.length,
      sections: raw.sections.length,
      segments: raw.segments.length,
    },
    sections: raw.sections,
  };
}

export async function getArtistGenres(artistId: string, accessToken: string): Promise<string[]> {
  const res = await loggedFetch(
    'Spotify GET /artists/{id}',
    `https://api.spotify.com/v1/artists/${artistId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw Object.assign(new Error(`Artist fetch failed: ${res.status}`), { status: res.status });
  const data = (await res.json()) as { genres: string[] };
  return data.genres ?? [];
}

async function playerCommand(method: 'PUT' | 'POST', endpoint: string, token: string): Promise<void> {
  const res = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  // 204 = success with no body; anything ≥ 400 is an error
  if (!res.ok && res.status !== 204) {
    throw Object.assign(new Error(`Spotify ${endpoint} failed: ${res.status}`), { status: res.status });
  }
}

export const pausePlayback   = (t: string) => playerCommand('PUT',  'pause',    t);
export const resumePlayback  = (t: string) => playerCommand('PUT',  'play',     t);
export const skipToNext      = (t: string) => playerCommand('POST', 'next',     t);
export const skipToPrevious  = (t: string) => playerCommand('POST', 'previous', t);
