/**
 * Tests for the Client class
 */

import { Client } from '../client';
import { Client as LrclibClient } from 'lrclib-api';
import { UnsyncedLyricsLine, SyncedLyricsLine } from '../types';

// Mock the lrclib-api
jest.mock('lrclib-api');

describe('Client', () => {
  let client: Client;
  let mockLrclibClient: jest.Mocked<LrclibClient>;

  beforeEach(() => {
    client = new Client({
      enableCache: false, // Disable cache for testing
      enableRateLimit: false, // Disable rate limiting for testing
    });

    // Get the mocked instance
    mockLrclibClient = (LrclibClient as jest.MockedClass<typeof LrclibClient>).mock.instances[0] as jest.Mocked<LrclibClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchSong', () => {
    it('should search for songs and return results', async () => {
      const mockMetadata = {
        id: 123,
        name: 'Test Song',
        trackName: 'Test Song',
        artistName: 'Test Artist',
        albumName: 'Test Album',
        duration: 180,
        instrumental: false,
        plainLyrics: 'Test lyrics',
        syncedLyrics: '[00:00] Test lyrics',
      } as any;

      mockLrclibClient.findLyrics.mockResolvedValue(mockMetadata);

      const query = {
        track_name: 'Test Song',
        artist_name: 'Test Artist',
      };

      const results = await client.searchSong(query);

      expect(results).toHaveLength(1);
      expect(results[0].metadata).toEqual(mockMetadata);
      expect(results[0].score).toBeGreaterThan(0);
      expect(mockLrclibClient.findLyrics).toHaveBeenCalledWith(query);
    });

    it('should throw error when no lyrics found', async () => {
      mockLrclibClient.findLyrics.mockResolvedValue(null as any);

      const query = {
        track_name: 'Nonexistent Song',
        artist_name: 'Nonexistent Artist',
      };

      await expect(client.searchSong(query)).rejects.toThrow('No lyrics found for the given query');
    });
  });

  describe('getUnsynced', () => {
    it('should get unsynced lyrics', async () => {
      const mockLyrics: UnsyncedLyricsLine[] = [
        { text: 'Line 1' },
        { text: 'Line 2' },
      ];

      mockLrclibClient.getUnsynced.mockResolvedValue(mockLyrics);

      const query = {
        track_name: 'Test Song',
        artist_name: 'Test Artist',
      };

      const result = await client.getUnsynced(query);

      expect(result.content).toBeDefined();
      expect(result.format).toBe('json');
      expect(mockLrclibClient.getUnsynced).toHaveBeenCalledWith(query);
    });
  });

  describe('getSynced', () => {
    it('should get synced lyrics', async () => {
      const mockLyrics: SyncedLyricsLine[] = [
        { text: 'Line 1', startTime: 0 },
        { text: 'Line 2', startTime: 1000 },
      ];

      mockLrclibClient.getSynced.mockResolvedValue(mockLyrics);

      const query = {
        track_name: 'Test Song',
        artist_name: 'Test Artist',
      };

      const result = await client.getSynced(query);

      expect(result.content).toBeDefined();
      expect(result.format).toBe('json');
      expect(mockLrclibClient.getSynced).toHaveBeenCalledWith(query);
    });
  });

  describe('findLyrics', () => {
    it('should find lyrics metadata', async () => {
      const mockMetadata = {
        id: 123,
        name: 'Test Song',
        trackName: 'Test Song',
        artistName: 'Test Artist',
        albumName: 'Test Album',
        duration: 180,
        instrumental: false,
        plainLyrics: undefined,
        syncedLyrics: undefined,
      } as any;

      mockLrclibClient.findLyrics.mockResolvedValue(mockMetadata);

      const query = {
        track_name: 'Test Song',
        artist_name: 'Test Artist',
      };

      const result = await client.findLyrics(query);

      expect(result).toEqual(mockMetadata);
      expect(mockLrclibClient.findLyrics).toHaveBeenCalledWith(query);
    });
  });

  describe('formatLyrics', () => {
    it('should format lyrics to plain text', () => {
      const lyrics: UnsyncedLyricsLine[] = [
        { text: 'Line 1' },
        { text: 'Line 2' },
      ];

      const result = client.formatLyrics(lyrics, 'plain');

      expect(result.content).toBe('Line 1\nLine 2');
      expect(result.format).toBe('plain');
    });

    it('should format synced lyrics to LRC', () => {
      const lyrics: SyncedLyricsLine[] = [
        { text: 'Line 1', startTime: 0 },
        { text: 'Line 2', startTime: 1000 },
      ];

      const result = client.formatLyrics(lyrics, 'lrc');

      expect(result.content).toContain('[00:00.00]Line 1');
      expect(result.content).toContain('[00:01.00]Line 2');
      expect(result.format).toBe('lrc');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      client.clearCache();
      const stats = client.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
