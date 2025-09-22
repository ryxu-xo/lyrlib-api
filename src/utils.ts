/**
 * Utility functions for lyrics formatting and processing
 */

import { 
  UnsyncedLyricsLine, 
  SyncedLyricsLine, 
  LyricsFormat, 
  FormattedLyrics,
  TrackMetadata,
  SearchResult,
  LyricsQuery,
  ValidationError
} from './types';

/**
 * Format lyrics to different output formats
 */
export function formatLyrics(
  lyrics: UnsyncedLyricsLine[] | SyncedLyricsLine[],
  format: LyricsFormat = 'json',
  metadata?: TrackMetadata
): FormattedLyrics {
  switch (format) {
    case 'plain':
      return {
        content: lyrics.map(line => line.text).join('\n'),
        format: 'plain',
        metadata,
      };

    case 'lrc':
      if (!isSyncedLyrics(lyrics)) {
        throw new ValidationError('LRC format requires synced lyrics');
      }
      return {
        content: formatToLRC(lyrics as SyncedLyricsLine[]),
        format: 'lrc',
        metadata,
      };

    case 'json':
    default:
      return {
        content: JSON.stringify(lyrics, null, 2),
        format: 'json',
        metadata,
      };
  }
}

/**
 * Check if lyrics are synced (have timestamps)
 */
function isSyncedLyrics(lyrics: UnsyncedLyricsLine[] | SyncedLyricsLine[]): lyrics is SyncedLyricsLine[] {
  return lyrics.length > 0 && 'startTime' in lyrics[0];
}

/**
 * Format synced lyrics to LRC format
 */
function formatToLRC(lyrics: SyncedLyricsLine[]): string {
  return lyrics
    .map(line => {
      const minutes = Math.floor(line.startTime / 60000);
      const seconds = Math.floor((line.startTime % 60000) / 1000);
      const centiseconds = Math.floor((line.startTime % 1000) / 10);
      const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}]`;
      return `${timestamp}${line.text}`;
    })
    .join('\n');
}

/**
 * Calculate similarity score between two strings
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // Simple Levenshtein distance-based similarity
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) {
    matrix[0]![i] = i;
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[j]![0] = j;
  }

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1,      // deletion
        matrix[j - 1]![i]! + 1,      // insertion
        matrix[j - 1]![i - 1]! + cost // substitution
      );
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : (maxLength - matrix[s2.length]![s1.length]!) / maxLength;
}

/**
 * Calculate search result score based on query and metadata
 */
export function calculateSearchScore(
  query: LyricsQuery,
  metadata: TrackMetadata
): number {
  let score = 0;
  let factors = 0;

  // Track name similarity
  if (query.track_name) {
    score += calculateSimilarity(query.track_name, metadata.trackName) * 0.4;
    factors += 0.4;
  }

  // Artist name similarity
  if (query.artist_name) {
    score += calculateSimilarity(query.artist_name, metadata.artistName) * 0.4;
    factors += 0.4;
  }

  // Album name similarity (bonus)
  if (query.album_name && metadata.albumName) {
    score += calculateSimilarity(query.album_name, metadata.albumName) * 0.2;
    factors += 0.2;
  }

  return factors > 0 ? score / factors : 0;
}

/**
 * Validate lyrics query
 */
export function validateQuery(query: Partial<LyricsQuery>): LyricsQuery {
  if (!query.track_name || !query.artist_name) {
    throw new ValidationError('track_name and artist_name are required');
  }

  if (typeof query.track_name !== 'string' || query.track_name.trim().length === 0) {
    throw new ValidationError('track_name must be a non-empty string');
  }

  if (typeof query.artist_name !== 'string' || query.artist_name.trim().length === 0) {
    throw new ValidationError('artist_name must be a non-empty string');
  }

  if (query.album_name && (typeof query.album_name !== 'string' || query.album_name.trim().length === 0)) {
    throw new ValidationError('album_name must be a non-empty string when provided');
  }

  const result: LyricsQuery = {
    track_name: query.track_name.trim(),
    artist_name: query.artist_name.trim(),
  };
  
  if (query.album_name) {
    result.album_name = query.album_name.trim();
  }
  
  return result;
}

/**
 * Create search result from metadata
 */
export function createSearchResult(
  metadata: TrackMetadata,
  query: LyricsQuery
): SearchResult {
  return {
    metadata,
    score: calculateSearchScore(query, metadata),
    hasSyncedLyrics: !!metadata.syncedLyrics,
    hasUnsyncedLyrics: !!metadata.plainLyrics,
  };
}

/**
 * Sort search results by relevance
 */
export function sortSearchResults(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Debounce function for search
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
