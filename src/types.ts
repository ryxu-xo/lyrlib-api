/**
 * Core types and interfaces for lyrlib-api
 */

/**
 * Basic query interface for searching lyrics
 */
export interface LyricsQuery {
  /** Track name */
  track_name: string;
  /** Artist name */
  artist_name: string;
  /** Optional album name for more precise matching */
  album_name?: string;
}

/**
 * Extended query interface with additional search options
 */
export interface ExtendedLyricsQuery extends LyricsQuery {
  /** Duration in seconds for better matching */
  duration?: number;
  /** Whether to prefer synced lyrics */
  prefer_synced?: boolean;
}

/**
 * Search options for the searchSong method
 */
export interface SearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Whether to include extended metadata */
  include_metadata?: boolean;
  /** Whether to prefer synced lyrics in results */
  prefer_synced?: boolean;
}

/**
 * Track metadata from lrclib.net
 */
export interface TrackMetadata {
  /** Unique track ID */
  id: number;
  /** Track name */
  name: string;
  /** Track name (alias for name) */
  trackName: string;
  /** Artist name */
  artistName: string;
  /** Album name */
  albumName: string;
  /** Duration in seconds */
  duration: number;
  /** Whether the track is instrumental */
  instrumental: boolean;
  /** Plain lyrics text */
  plainLyrics?: string | null;
  /** Synced lyrics in LRC format */
  syncedLyrics?: string | null;
}

/**
 * Unsynced lyrics line
 */
export interface UnsyncedLyricsLine {
  /** Text content of the line */
  text: string;
}

/**
 * Synced lyrics line with timestamp
 */
export interface SyncedLyricsLine {
  /** Text content of the line */
  text: string;
  /** Start time in milliseconds */
  startTime: number;
}

/**
 * Lyrics format options
 */
export type LyricsFormat = 'plain' | 'lrc' | 'json';

/**
 * Client configuration options
 */
export interface ClientOptions {
  /** Enable caching (default: true) */
  enableCache?: boolean;
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
  cacheTTL?: number;
  /** Enable rate limiting (default: true) */
  enableRateLimit?: boolean;
  /** Maximum requests per minute (default: 60) */
  maxRequestsPerMinute?: number;
  /** Request timeout in milliseconds (default: 10000) */
  requestTimeout?: number;
  /** User agent string for requests */
  userAgent?: string;
}

/**
 * Search result item
 */
export interface SearchResult {
  /** Track metadata */
  metadata: TrackMetadata;
  /** Relevance score (0-1) */
  score: number;
  /** Whether synced lyrics are available */
  hasSyncedLyrics: boolean;
  /** Whether unsynced lyrics are available */
  hasUnsyncedLyrics: boolean;
}

/**
 * Lyrics retrieval options
 */
export interface LyricsOptions {
  /** Whether to fetch synced lyrics */
  synced?: boolean;
  /** Whether to include metadata */
  includeMetadata?: boolean;
  /** Format for lyrics output */
  format?: LyricsFormat;
}

/**
 * Formatted lyrics result
 */
export interface FormattedLyrics {
  /** The formatted lyrics content */
  content: string;
  /** The format used */
  format: LyricsFormat;
  /** Track metadata (if requested) */
  metadata?: TrackMetadata;
}

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  timestamp: number;
  /** TTL in milliseconds */
  ttl: number;
}

/**
 * Rate limit state
 */
export interface RateLimitState {
  /** Number of requests made in current window */
  requests: number;
  /** Window start timestamp */
  windowStart: number;
  /** Whether currently rate limited */
  isLimited: boolean;
}

/**
 * Error types for better error handling
 */
export class LyrlibError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'LyrlibError';
  }
}

export class RateLimitError extends LyrlibError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends LyrlibError {
  constructor(message: string = 'Lyrics not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class TimeoutError extends LyrlibError {
  constructor(message: string = 'Request timeout') {
    super(message, 'TIMEOUT', 408);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends LyrlibError {
  constructor(message: string = 'Invalid input parameters') {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}
