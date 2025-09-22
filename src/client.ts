/**
 * Enhanced lyrlib-api Client with advanced features
 */

import { Client as LrclibClient } from 'lrclib-api';
import { 
  ClientOptions, 
  LyricsQuery, 
  SearchOptions,
  TrackMetadata,
  UnsyncedLyricsLine,
  SyncedLyricsLine,
  LyricsOptions,
  FormattedLyrics,
  SearchResult,
  NotFoundError,
  TimeoutError
} from './types';
import { Cache } from './cache';
import { RateLimiter } from './rateLimiter';
import { 
  formatLyrics, 
  validateQuery, 
  createSearchResult
} from './utils';

/**
 * Type adapter for lrclib-api responses
 */
function adaptLrclibMetadata(metadata: any): TrackMetadata {
  return {
    id: metadata.id,
    name: metadata.name,
    trackName: metadata.trackName,
    artistName: metadata.artistName,
    albumName: metadata.albumName,
    duration: metadata.duration,
    instrumental: metadata.instrumental,
    plainLyrics: metadata.plainLyrics ?? undefined,
    syncedLyrics: metadata.syncedLyrics ?? undefined,
  };
}

/**
 * Query adapter for lrclib-api compatibility
 */
function adaptQueryForLrclib(query: LyricsQuery): any {
  const adapted: any = {
    track_name: query.track_name,
    artist_name: query.artist_name,
  };
  
  if (query.album_name) {
    adapted.album_name = query.album_name;
  }
  
  return adapted;
}

/**
 * Type adapter for lrclib-api lyrics
 */
function adaptLrclibLyrics(lyrics: any[] | null): UnsyncedLyricsLine[] | SyncedLyricsLine[] {
  if (!lyrics) {
    return [];
  }
  
  // Check if lyrics have startTime property (synced)
  if (lyrics.length > 0 && 'startTime' in lyrics[0]) {
    return lyrics as SyncedLyricsLine[];
  } else {
    return lyrics as UnsyncedLyricsLine[];
  }
}

/**
 * Enhanced lyrclib-api client with caching, rate limiting, and advanced features
 */
export class Client {
  private lrclibClient: LrclibClient;
  private cache: Cache;
  private rateLimiter: RateLimiter;
  private options: Required<ClientOptions>;

  constructor(options: ClientOptions = {}) {
    this.options = {
      enableCache: true,
      cacheTTL: 300000, // 5 minutes
      enableRateLimit: true,
      maxRequestsPerMinute: 60,
      requestTimeout: 10000,
      userAgent: 'lyrlib-api/1.0.0',
      ...options,
    };

    this.lrclibClient = new LrclibClient();
    this.cache = new Cache(this.options.cacheTTL);
    this.rateLimiter = new RateLimiter(
      this.options.maxRequestsPerMinute,
      60000 // 1 minute window
    );
  }

  /**
   * Search for songs with advanced filtering and scoring
   * @param query - Search query parameters
   * @param options - Search options
   * @returns Array of search results sorted by relevance
   */
  async searchSong(
    query: LyricsQuery,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const validatedQuery = validateQuery(query);
    const searchOptions = {
      limit: 10,
      include_metadata: true,
      prefer_synced: false,
      ...options,
    };

    const cacheKey = Cache.generateKey('search', { ...validatedQuery, ...searchOptions });
    
    if (this.options.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as SearchResult[];
      }
    }

    try {
      if (this.options.enableRateLimit) {
        this.rateLimiter.checkLimit();
      }

      const rawMetadata = await this.withTimeout(
        () => this.lrclibClient.findLyrics(adaptQueryForLrclib(validatedQuery)),
        this.options.requestTimeout
      );

      if (!rawMetadata) {
        throw new NotFoundError('No lyrics found for the given query');
      }

      const metadata = adaptLrclibMetadata(rawMetadata);
      const searchResult = createSearchResult(metadata, validatedQuery);
      const results = [searchResult].slice(0, searchOptions.limit);

      if (this.options.enableCache) {
        this.cache.set(cacheKey, results);
      }

      return results;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get lyrics by track ID
   * @param trackId - Unique track identifier
   * @param options - Lyrics retrieval options
   * @returns Formatted lyrics
   */
  async getLyricsById(
    trackId: number,
    options: LyricsOptions = {}
  ): Promise<FormattedLyrics> {
    const lyricsOptions = {
      synced: false,
      includeMetadata: true,
      format: 'json' as const,
      ...options,
    };

    const cacheKey = Cache.generateKey('lyrics_by_id', { trackId, ...lyricsOptions });

    if (this.options.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as FormattedLyrics;
      }
    }

    try {
      if (this.options.enableRateLimit) {
        this.rateLimiter.checkLimit();
      }

      // For now, we'll need to search by query since lrclib-api doesn't have getById
      // This is a limitation we'll document
      throw new NotFoundError('getLyricsById is not yet implemented - use searchSong and getLyricsByMetadata instead');
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Failed to get lyrics by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get lyrics by metadata with fallback search
   * @param metadata - Track metadata for search
   * @param options - Lyrics retrieval options
   * @returns Formatted lyrics
   */
  async getLyricsByMetadata(
    metadata: { title: string; artist: string; album?: string },
    options: LyricsOptions = {}
  ): Promise<FormattedLyrics> {
      const query: LyricsQuery = {
        track_name: metadata.title,
        artist_name: metadata.artist,
      };
      
      if (metadata.album) {
        query.album_name = metadata.album;
      }

    const lyricsOptions = {
      synced: false,
      includeMetadata: true,
      format: 'json' as const,
      ...options,
    };

    const cacheKey = Cache.generateKey('lyrics_by_metadata', { ...query, ...lyricsOptions });

    if (this.options.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as FormattedLyrics;
      }
    }

    try {
      if (this.options.enableRateLimit) {
        this.rateLimiter.checkLimit();
      }

      // First search for the track
      const searchResults = await this.searchSong(query, { limit: 1 });
      
      if (searchResults.length === 0) {
        throw new NotFoundError('No lyrics found for the given metadata');
      }

      const trackMetadata = searchResults[0].metadata;
      let rawLyrics: any[] | null;

      if (lyricsOptions.synced) {
        rawLyrics = await this.withTimeout(
          () => this.lrclibClient.getSynced(adaptQueryForLrclib(query)),
          this.options.requestTimeout
        );
      } else {
        rawLyrics = await this.withTimeout(
          () => this.lrclibClient.getUnsynced(adaptQueryForLrclib(query)),
          this.options.requestTimeout
        );
      }

      const lyrics = adaptLrclibLyrics(rawLyrics);

      const formattedLyrics = formatLyrics(
        lyrics, 
        lyricsOptions.format, 
        lyricsOptions.includeMetadata ? trackMetadata : undefined
      );

      if (this.options.enableCache) {
        this.cache.set(cacheKey, formattedLyrics);
      }

      return formattedLyrics;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Failed to get lyrics by metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get unsynced lyrics (plain text)
   * @param query - Lyrics query
   * @param options - Additional options
   * @returns Unsynced lyrics
   */
  async getUnsynced(
    query: LyricsQuery,
    options: { includeMetadata?: boolean; format?: 'plain' | 'json' } = {}
  ): Promise<FormattedLyrics> {
    const validatedQuery = validateQuery(query);
    const cacheKey = Cache.generateKey('unsynced', { ...validatedQuery, ...options });

    if (this.options.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as FormattedLyrics;
      }
    }

    try {
      if (this.options.enableRateLimit) {
        this.rateLimiter.checkLimit();
      }

      const rawLyrics = await this.withTimeout(
        () => this.lrclibClient.getUnsynced(adaptQueryForLrclib(validatedQuery)),
        this.options.requestTimeout
      );

      const lyrics = adaptLrclibLyrics(rawLyrics);

      let metadata: TrackMetadata | undefined;
      if (options.includeMetadata) {
        const rawMetadata = await this.withTimeout(
          () => this.lrclibClient.findLyrics(adaptQueryForLrclib(validatedQuery)),
          this.options.requestTimeout
        );
        metadata = rawMetadata ? adaptLrclibMetadata(rawMetadata) : undefined;
      }

      const formattedLyrics = formatLyrics(
        lyrics, 
        options.format || 'json', 
        metadata
      );

      if (this.options.enableCache) {
        this.cache.set(cacheKey, formattedLyrics);
      }

      return formattedLyrics;
    } catch (error) {
      throw new Error(`Failed to get unsynced lyrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get synced lyrics (timestamped)
   * @param query - Lyrics query
   * @param options - Additional options
   * @returns Synced lyrics
   */
  async getSynced(
    query: LyricsQuery,
    options: { includeMetadata?: boolean; format?: 'lrc' | 'json' } = {}
  ): Promise<FormattedLyrics> {
    const validatedQuery = validateQuery(query);
    const cacheKey = Cache.generateKey('synced', { ...validatedQuery, ...options });

    if (this.options.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as FormattedLyrics;
      }
    }

    try {
      if (this.options.enableRateLimit) {
        this.rateLimiter.checkLimit();
      }

      const rawLyrics = await this.withTimeout(
        () => this.lrclibClient.getSynced(adaptQueryForLrclib(validatedQuery)),
        this.options.requestTimeout
      );

      const lyrics = adaptLrclibLyrics(rawLyrics);

      let metadata: TrackMetadata | undefined;
      if (options.includeMetadata) {
        const rawMetadata = await this.withTimeout(
          () => this.lrclibClient.findLyrics(adaptQueryForLrclib(validatedQuery)),
          this.options.requestTimeout
        );
        metadata = rawMetadata ? adaptLrclibMetadata(rawMetadata) : undefined;
      }

      const formattedLyrics = formatLyrics(
        lyrics, 
        options.format || 'json', 
        metadata
      );

      if (this.options.enableCache) {
        this.cache.set(cacheKey, formattedLyrics);
      }

      return formattedLyrics;
    } catch (error) {
      throw new Error(`Failed to get synced lyrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get track metadata
   * @param query - Lyrics query
   * @returns Track metadata
   */
  async findLyrics(query: LyricsQuery): Promise<TrackMetadata> {
    const validatedQuery = validateQuery(query);
    const cacheKey = Cache.generateKey('metadata', validatedQuery);

    if (this.options.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as TrackMetadata;
      }
    }

    try {
      if (this.options.enableRateLimit) {
        this.rateLimiter.checkLimit();
      }

      const rawMetadata = await this.withTimeout(
        () => this.lrclibClient.findLyrics(adaptQueryForLrclib(validatedQuery)),
        this.options.requestTimeout
      );

      if (!rawMetadata) {
        throw new NotFoundError('No lyrics found for the given query');
      }

      const metadata = adaptLrclibMetadata(rawMetadata);

      if (this.options.enableCache) {
        this.cache.set(cacheKey, metadata);
      }

      return metadata;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Failed to find lyrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format lyrics to different output formats
   * @param lyrics - Lyrics to format
   * @param format - Output format
   * @param metadata - Optional track metadata
   * @returns Formatted lyrics
   */
  formatLyrics(
    lyrics: UnsyncedLyricsLine[] | SyncedLyricsLine[],
    format: 'plain' | 'lrc' | 'json' = 'json',
    metadata?: TrackMetadata
  ): FormattedLyrics {
    return formatLyrics(lyrics, format, metadata);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; cleaned: number } {
    const cleaned = this.cache.clean();
    return {
      size: this.cache.size(),
      cleaned,
    };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Reset rate limiter
   */
  resetRateLimit(): void {
    this.rateLimiter.reset();
  }

  /**
   * Wrapper for timeout functionality
   */
  private async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new TimeoutError()), timeoutMs);
      }),
    ]);
  }
}
