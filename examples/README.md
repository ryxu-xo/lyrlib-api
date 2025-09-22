# lyrlib-api Examples

This directory contains practical examples showing how to use the `lyrlib-api` package in different scenarios.

## 📁 Examples

### 1. Standalone Demo (`standalone-demo.html`)
A static HTML page that demonstrates the package features without requiring a server.

**To view:**
```bash
# Simply open the file in your browser
open standalone-demo.html
```

### 2. Web Application (`web-app.ts` + `public/index.html`)
A full Express.js web application with API endpoints and an interactive web interface.

**To run:**
```bash
cd examples
npm install
npm run web-app
```

Then open `http://localhost:3000` in your browser.

**Features:**
- REST API endpoints for lyrics search
- Interactive web interface
- Real-time search functionality
- Multiple format support

### 3. Discord Bot (`discord-bot.js`)
A Discord bot integration example showing how to add lyrics functionality to a music bot.

**To use:**
1. Install Discord.js: `npm install discord.js`
2. Replace `YOUR_BOT_TOKEN` with your actual bot token
3. Run the bot: `node discord-bot.js`

**Features:**
- Slash command for lyrics search
- Rich embed responses
- Error handling
- Caching for performance

## 🚀 Quick Start

### Basic Usage
```javascript
const { Client } = require('lyrlib-api');

const client = new Client();

async function searchLyrics() {
  try {
    const query = {
      track_name: "Bohemian Rhapsody",
      artist_name: "Queen"
    };

    // Search for the song
    const results = await client.searchSong(query);
    console.log('Found:', results[0].metadata.trackName);

    // Get lyrics
    const lyrics = await client.getSynced(query, { format: 'lrc' });
    console.log('Lyrics:', lyrics.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

searchLyrics();
```

### Advanced Configuration
```javascript
const client = new Client({
  enableCache: true,
  cacheTTL: 300000, // 5 minutes
  enableRateLimit: true,
  maxRequestsPerMinute: 60,
  requestTimeout: 10000,
  userAgent: 'MyApp/1.0.0'
});
```

## 📚 API Reference

### Client Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `searchSong(query, options)` | Search for songs with scoring | `query: LyricsQuery`, `options?: SearchOptions` |
| `getLyricsById(trackId, options)` | Get lyrics by track ID | `trackId: number`, `options?: LyricsOptions` |
| `getLyricsByMetadata(metadata, options)` | Get lyrics by metadata | `metadata: object`, `options?: LyricsOptions` |
| `getUnsynced(query, options)` | Get plain text lyrics | `query: LyricsQuery`, `options?: object` |
| `getSynced(query, options)` | Get timestamped lyrics | `query: LyricsQuery`, `options?: object` |
| `findLyrics(query)` | Get track metadata only | `query: LyricsQuery` |
| `formatLyrics(lyrics, format, metadata)` | Format lyrics | `lyrics: array`, `format: string`, `metadata?: object` |

### Query Interface
```typescript
interface LyricsQuery {
  track_name: string;
  artist_name: string;
  album_name?: string;
}
```

### Options
```typescript
interface SearchOptions {
  limit?: number;
  include_metadata?: boolean;
  prefer_synced?: boolean;
}

interface LyricsOptions {
  synced?: boolean;
  includeMetadata?: boolean;
  format?: 'plain' | 'lrc' | 'json';
}
```

## 🔧 Development

To run the examples locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ryxu-xo/lyrlib-api.git
   cd lyrlib-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the package:**
   ```bash
   npm run build
   ```

4. **Run examples:**
   ```bash
   cd examples
   npm install
   npm run web-app
   ```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
