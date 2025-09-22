/**
 * lyrlib-api - Advanced TypeScript wrapper for lrclib.net API
 * 
 * @packageDocumentation
 */

// Main client export
export { Client } from './client';

// Type exports
export type {
  ClientOptions,
  LyricsQuery,
  ExtendedLyricsQuery,
  SearchOptions,
  TrackMetadata,
  UnsyncedLyricsLine,
  SyncedLyricsLine,
  LyricsOptions,
  FormattedLyrics,
  SearchResult,
  LyricsFormat,
  CacheEntry,
  RateLimitState,
} from './types';

// Error exports
export {
  LyrlibError,
  RateLimitError,
  NotFoundError,
  TimeoutError,
  ValidationError,
} from './types';

// Utility exports
export {
  formatLyrics,
  calculateSimilarity,
  calculateSearchScore,
  validateQuery,
  createSearchResult,
  sortSearchResults,
  debounce,
  retry,
} from './utils';

// Cache and rate limiter exports (for advanced usage)
export { Cache } from './cache';
export { RateLimiter } from './rateLimiter';

// Default export
export { Client as default } from './client';
