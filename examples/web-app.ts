/**
 * Web Application Example using lyrlib-api
 * 
 * This example shows how to integrate lyrlib-api with a web application
 * using Express.js and TypeScript.
 */

import express from 'express';
import { Client, SearchResult, FormattedLyrics } from 'lyrlib-api';

const app = express();
const port = process.env.PORT || 3000;

// Initialize the lyrics client
const lyricsClient = new Client({
  enableCache: true,
  cacheTTL: 300000, // 5 minutes
  enableRateLimit: true,
  maxRequestsPerMinute: 60,
  requestTimeout: 10000,
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// API Routes

/**
 * Search for songs
 * GET /api/search?q=song+artist
 */
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    // Parse query (format: "song - artist" or "song artist")
    const parts = query.split(' - ');
    let track, artist;
    
    if (parts.length === 2) {
      [track, artist] = parts;
    } else {
      // Try to split by last space (assume last word is artist)
      const words = query.split(' ');
      if (words.length >= 2) {
        artist = words.pop();
        track = words.join(' ');
      } else {
        return res.status(400).json({ error: 'Please provide both song and artist' });
      }
    }

    const results = await lyricsClient.searchSong(
      { track_name: track.trim(), artist_name: artist.trim() },
      { limit: 10, include_metadata: true }
    );

    res.json({
      success: true,
      results: results.map(result => ({
        id: result.metadata.id,
        track: result.metadata.trackName,
        artist: result.metadata.artistName,
        album: result.metadata.albumName,
        duration: result.metadata.duration,
        score: result.score,
        hasSyncedLyrics: result.hasSyncedLyrics,
        hasUnsyncedLyrics: result.hasUnsyncedLyrics,
      }))
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get lyrics by track ID
 * GET /api/lyrics/:id?synced=true&format=json
 */
app.get('/api/lyrics/:id', async (req, res) => {
  try {
    const trackId = parseInt(req.params.id);
    const synced = req.query.synced === 'true';
    const format = (req.query.format as 'plain' | 'lrc' | 'json') || 'json';

    if (isNaN(trackId)) {
      return res.status(400).json({ error: 'Invalid track ID' });
    }

    const lyrics = await lyricsClient.getLyricsById(trackId, {
      synced,
      format,
      includeMetadata: true
    });

    res.json({
      success: true,
      lyrics: lyrics.content,
      format: lyrics.format,
      metadata: lyrics.metadata
    });

  } catch (error) {
    console.error('Lyrics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get lyrics by song and artist
 * GET /api/lyrics?song=...&artist=...&synced=true&format=json
 */
app.get('/api/lyrics', async (req, res) => {
  try {
    const song = req.query.song as string;
    const artist = req.query.artist as string;
    const synced = req.query.synced === 'true';
    const format = (req.query.format as 'plain' | 'lrc' | 'json') || 'json';

    if (!song || !artist) {
      return res.status(400).json({ error: 'Both "song" and "artist" parameters are required' });
    }

    const lyrics = synced
      ? await lyricsClient.getSynced(
          { track_name: song, artist_name: artist },
          { format, includeMetadata: true }
        )
      : await lyricsClient.getUnsynced(
          { track_name: song, artist_name: artist },
          { format, includeMetadata: true }
        );

    res.json({
      success: true,
      lyrics: lyrics.content,
      format: lyrics.format,
      metadata: lyrics.metadata
    });

  } catch (error) {
    console.error('Lyrics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const cacheStats = lyricsClient.getCacheStats();
  const rateLimitStatus = lyricsClient.getRateLimitStatus();
  
  res.json({
    status: 'healthy',
    cache: {
      size: cacheStats.size,
      cleaned: cacheStats.cleaned
    },
    rateLimit: {
      requests: rateLimitStatus.requests,
      maxRequests: rateLimitStatus.maxRequests,
      isLimited: rateLimitStatus.isLimited
    }
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
  console.log(`Search API: http://localhost:${port}/api/search?q=song+artist`);
});

export default app;
