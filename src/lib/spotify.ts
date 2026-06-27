const GENRE_LIST = [
  'rap', 'hip hop', 'rock', 'alternative', 'country',
  'trap', 'metal', 'jazz', 'r&b', 'pop', 'funk', 'edm', 'soul',
] as const;

type Genre = (typeof GENRE_LIST)[number];

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

// Returns the genre from GENRE_LIST with the highest frequency in genreArray.
// Uses strict > so the first genre wins ties (fixes original >= bug).
export function genreFinder(genreArray: string[]): Genre | undefined {
  if (genreArray.length === 0) return undefined;

  const frequency: Record<string, number> = {};
  for (const g of GENRE_LIST) frequency[g] = 0;

  let topGenre: Genre | undefined;
  let topCount = 0;

  for (const genre of GENRE_LIST) {
    for (const tag of genreArray) {
      if (tag.includes(genre)) frequency[genre]++;
    }
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

export async function getArtistGenres(artistId: string, accessToken: string): Promise<string[]> {
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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
