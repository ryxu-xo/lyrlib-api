/**
 * Tests for utility functions
 */

import {
  formatLyrics,
  calculateSimilarity,
  validateQuery,
  createSearchResult,
  sortSearchResults,
} from '../utils';
import { TrackMetadata, UnsyncedLyricsLine, SyncedLyricsLine } from '../types';

describe('Utils', () => {
  describe('formatLyrics', () => {
    it('should format unsynced lyrics to plain text', () => {
      const lyrics: UnsyncedLyricsLine[] = [
        { text: 'Line 1' },
        { text: 'Line 2' },
      ];

      const result = formatLyrics(lyrics, 'plain');

      expect(result.content).toBe('Line 1\nLine 2');
      expect(result.format).toBe('plain');
    });

    it('should format synced lyrics to LRC', () => {
      const lyrics: SyncedLyricsLine[] = [
        { text: 'Line 1', startTime: 0 },
        { text: 'Line 2', startTime: 1000 },
      ];

      const result = formatLyrics(lyrics, 'lrc');

      expect(result.content).toContain('[00:00.00]Line 1');
      expect(result.content).toContain('[00:01.00]Line 2');
      expect(result.format).toBe('lrc');
    });

    it('should format lyrics to JSON', () => {
      const lyrics: UnsyncedLyricsLine[] = [
        { text: 'Line 1' },
        { text: 'Line 2' },
      ];

      const result = formatLyrics(lyrics, 'json');

      expect(() => JSON.parse(result.content)).not.toThrow();
      expect(result.format).toBe('json');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateSimilarity('hello', 'hello')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(calculateSimilarity('hello', 'xyz')).toBeLessThan(0.5);
    });

    it('should be case insensitive', () => {
      expect(calculateSimilarity('Hello', 'hello')).toBe(1);
    });

    it('should handle empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(1);
      expect(calculateSimilarity('hello', '')).toBeLessThan(0.5);
    });
  });

  describe('validateQuery', () => {
    it('should validate correct query', () => {
      const query = {
        track_name: 'Test Song',
        artist_name: 'Test Artist',
      };

      const result = validateQuery(query);

      expect(result).toEqual({
        track_name: 'Test Song',
        artist_name: 'Test Artist',
      });
    });

    it('should trim whitespace', () => {
      const query = {
        track_name: '  Test Song  ',
        artist_name: '  Test Artist  ',
      };

      const result = validateQuery(query);

      expect(result).toEqual({
        track_name: 'Test Song',
        artist_name: 'Test Artist',
      });
    });

    it('should throw error for missing track_name', () => {
      const query = {
        artist_name: 'Test Artist',
      };

      expect(() => validateQuery(query)).toThrow('track_name and artist_name are required');
    });

    it('should throw error for missing artist_name', () => {
      const query = {
        track_name: 'Test Song',
      };

      expect(() => validateQuery(query)).toThrow('track_name and artist_name are required');
    });

    it('should throw error for empty track_name', () => {
      const query = {
        track_name: '',
        artist_name: 'Test Artist',
      };

      expect(() => validateQuery(query)).toThrow('track_name and artist_name are required');
    });
  });

  describe('createSearchResult', () => {
    it('should create search result with correct score', () => {
      const metadata: TrackMetadata = {
        id: 123,
        name: 'Test Song',
        trackName: 'Test Song',
        artistName: 'Test Artist',
        albumName: 'Test Album',
        duration: 180,
        instrumental: false,
      };

      const query = {
        track_name: 'Test Song',
        artist_name: 'Test Artist',
      };

      const result = createSearchResult(metadata, query);

      expect(result.metadata).toEqual(metadata);
      expect(result.score).toBeGreaterThan(0);
      expect(result.hasSyncedLyrics).toBe(false);
      expect(result.hasUnsyncedLyrics).toBe(false);
    });
  });

  describe('sortSearchResults', () => {
    it('should sort results by score descending', () => {
      const results = [
        { metadata: {} as TrackMetadata, score: 0.5, hasSyncedLyrics: false, hasUnsyncedLyrics: false },
        { metadata: {} as TrackMetadata, score: 0.8, hasSyncedLyrics: false, hasUnsyncedLyrics: false },
        { metadata: {} as TrackMetadata, score: 0.3, hasSyncedLyrics: false, hasUnsyncedLyrics: false },
      ];

      const sorted = sortSearchResults(results);

      expect(sorted[0].score).toBe(0.8);
      expect(sorted[1].score).toBe(0.5);
      expect(sorted[2].score).toBe(0.3);
    });
  });
});
