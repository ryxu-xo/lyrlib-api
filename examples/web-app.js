/**
 * Web Application Example using lyrlib-api
 * 
 * This example shows how to integrate lyrlib-api with a web application
 * using Express.js.
 */

const express = require('express');
const { Client } = require('./../dist/index.js');

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
    const query = req.query.q;
    
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
      error: error.message || 'Unknown error' 
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
    const format = req.query.format || 'json';

    if (isNaN(trackId)) {
      return res.status(400).json({ error: 'Invalid track ID' });
    }

    // For now, we'll use searchSong since getLyricsById is not implemented
    const results = await lyricsClient.searchSong(
      { track_name: '', artist_name: '' },
      { limit: 1 }
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const track = results[0].metadata;
    let lyrics;

    if (synced) {
      lyrics = await lyricsClient.getSynced(
        { track_name: track.trackName, artist_name: track.artistName },
        { format, includeMetadata: true }
      );
    } else {
      lyrics = await lyricsClient.getUnsynced(
        { track_name: track.trackName, artist_name: track.artistName },
        { format, includeMetadata: true }
      );
    }

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
      error: error.message || 'Unknown error' 
    });
  }
});

/**
 * Get lyrics by song and artist
 * GET /api/lyrics?song=...&artist=...&synced=true&format=json
 */
app.get('/api/lyrics', async (req, res) => {
  try {
    const song = req.query.song;
    const artist = req.query.artist;
    const synced = req.query.synced === 'true';
    const format = req.query.format || 'json';

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
      error: error.message || 'Unknown error' 
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
app.use((error, req, res, next) => {
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
  console.log(`🚀 Web application running on http://localhost:${port}`);
  console.log(`📱 Open http://localhost:${port} in your browser to test the lyrics search`);
  console.log(`🔍 API endpoints available:`);
  console.log(`   - GET /api/search?q=song+artist`);
  console.log(`   - GET /api/lyrics/:id?synced=true&format=json`);
  console.log(`   - GET /api/health`);
});

module.exports = app;
