# lyrlib-api

[![npm version](https://badge.fury.io/js/lyrlib-api.svg)](https://badge.fury.io/js/lyrlib-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

**lyrlib-api** is an advanced TypeScript wrapper for the [lrclib.net](https://lrclib.net) API, providing enhanced features for developers building Discord music bots, web applications, and music players. It offers intelligent caching, rate limiting, multiple lyrics formats, and comprehensive error handling.

## ✨ Features

- 🎵 **Multiple Lyrics Formats**: Plain text, LRC (timestamped), and JSON formats
- 🔍 **Advanced Search**: Smart search with relevance scoring and filtering
- ⚡ **Performance**: Built-in caching and rate limiting to optimize API usage
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🎯 **Developer Experience**: IntelliSense support with detailed JSDoc comments
- 🔄 **Flexible API**: Support for both ESM and CommonJS modules
- 🚀 **Production Ready**: Error handling, retry logic, and timeout management
- 🤖 **Discord Bot Ready**: Optimized for music bot development

## 📦 Installation

```bash
npm install lyrlib-api
```

```bash
yarn add lyrlib-api
```

```bash
pnpm add lyrlib-api
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { Client } from 'lyrlib-api';

const client = new Client();

// Search for lyrics
const query = {
  track_name: "The Chain",
  artist_name: "Fleetwood Mac",
};

try {
  // Get track metadata
  const metadata = await client.findLyrics(query);
  console.log("Track:", metadata.trackName, "by", metadata.artistName);

  // Get unsynced lyrics (plain text)
  const unsynced = await client.getUnsynced(query);
  console.log("Lyrics:", unsynced.content);

  // Get synced lyrics (timestamped)
  const synced = await client.getSynced(query);
  console.log("Synced Lyrics:", synced.content);
} catch (error) {
  console.error("Error:", error.message);
}
```

### Advanced Configuration

```typescript
import { Client, ClientOptions } from 'lyrlib-api';

const options: ClientOptions = {
  enableCache: true,
  cacheTTL: 300000, // 5 minutes
  enableRateLimit: true,
  maxRequestsPerMinute: 60,
  requestTimeout: 10000,
  userAgent: 'MyApp/1.0.0',
};

const client = new Client(options);
```

## 📚 API Reference

### Client Class

#### Constructor

```typescript
new Client(options?: ClientOptions)
```

#### Methods

##### `searchSong(query, options?)`

Search for songs with advanced filtering and relevance scoring.

```typescript
const results = await client.searchSong(
  { track_name: "Bohemian Rhapsody", artist_name: "Queen" },
  { limit: 5, include_metadata: true, prefer_synced: true }
);
```

##### `getLyricsById(trackId, options?)`

Fetch lyrics by track ID.

```typescript
const lyrics = await client.getLyricsById(12345, {
  synced: true,
  format: 'lrc',
  includeMetadata: true
});
```

##### `getLyricsByMetadata(metadata, options?)`

Fetch lyrics using track metadata with fallback search.

```typescript
const lyrics = await client.getLyricsByMetadata(
  { title: "Hotel California", artist: "Eagles", album: "Hotel California" },
  { synced: false, format: 'plain' }
);
```

##### `getUnsynced(query, options?)`

Get unsynced (plain text) lyrics.

```typescript
const lyrics = await client.getUnsynced(query, {
  includeMetadata: true,
  format: 'plain'
});
```

##### `getSynced(query, options?)`

Get synced (timestamped) lyrics.

```typescript
const lyrics = await client.getSynced(query, {
  includeMetadata: true,
  format: 'lrc'
});
```

##### `findLyrics(query)`

Get track metadata without lyrics.

```typescript
const metadata = await client.findLyrics({
  track_name: "Imagine",
  artist_name: "John Lennon"
});
```

##### `formatLyrics(lyrics, format, metadata?)`

Format lyrics to different output formats.

```typescript
const formatted = client.formatLyrics(lyrics, 'lrc', metadata);
```

### Utility Functions

#### `formatLyrics(lyrics, format, metadata?)`

Format lyrics to different output formats.

```typescript
import { formatLyrics } from 'lyrlib-api';

const formatted = formatLyrics(lyrics, 'plain');
```

#### `calculateSimilarity(str1, str2)`

Calculate similarity between two strings.

```typescript
import { calculateSimilarity } from 'lyrlib-api';

const similarity = calculateSimilarity("Hello", "Hallo"); // 0.8
```

## 🎯 Use Cases

### Discord Music Bot

```typescript
import { Client } from 'lyrlib-api';
import { EmbedBuilder } from 'discord.js';

const client = new Client({
  enableCache: true,
  cacheTTL: 600000, // 10 minutes
});

export async function getLyricsEmbed(track: string, artist: string) {
  try {
    const query = { track_name: track, artist_name: artist };
    
    // Search for the song
    const results = await client.searchSong(query, { limit: 1 });
    
    if (results.length === 0) {
      return new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Lyrics Not Found')
        .setDescription(`No lyrics found for "${track}" by ${artist}`);
    }

    const song = results[0];
    
    // Get synced lyrics for better display
    const lyrics = await client.getSynced(query, { 
      format: 'lrc',
      includeMetadata: true 
    });

    return new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle(`🎵 ${song.metadata.trackName}`)
      .setDescription(`by ${song.metadata.artistName}`)
      .addFields(
        { name: 'Album', value: song.metadata.albumName, inline: true },
        { name: 'Duration', value: `${Math.floor(song.metadata.duration / 60)}:${(song.metadata.duration % 60).toString().padStart(2, '0')}`, inline: true },
        { name: 'Lyrics', value: `\`\`\`\n${lyrics.content.substring(0, 1000)}...\n\`\`\`` }
      )
      .setFooter({ text: 'Powered by lyrlib-api' });

  } catch (error) {
    return new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Error')
      .setDescription(`Failed to fetch lyrics: ${error.message}`);
  }
}
```

### Web Application

```typescript
import { Client, SearchResult } from 'lyrlib-api';

const client = new Client({
  enableCache: true,
  enableRateLimit: true,
  maxRequestsPerMinute: 30,
});

export class LyricsService {
  async searchSongs(query: string): Promise<SearchResult[]> {
    const [track, artist] = query.split(' - ');
    
    if (!track || !artist) {
      throw new Error('Please provide song in format "Track - Artist"');
    }

    return await client.searchSong(
      { track_name: track.trim(), artist_name: artist.trim() },
      { limit: 10, include_metadata: true }
    );
  }

  async getLyrics(trackId: number, synced: boolean = false) {
    return await client.getLyricsById(trackId, {
      synced,
      format: synced ? 'lrc' : 'plain',
      includeMetadata: true
    });
  }
}
```

### Music Player Integration

```typescript
import { Client, FormattedLyrics } from 'lyrlib-api';

class MusicPlayer {
  private client = new Client();
  private currentLyrics: FormattedLyrics | null = null;

  async loadTrack(track: string, artist: string) {
    try {
      // Search for the track
      const results = await this.client.searchSong(
        { track_name: track, artist_name: artist },
        { limit: 1, prefer_synced: true }
      );

      if (results.length === 0) {
        throw new Error('Track not found');
      }

      // Get synced lyrics for karaoke-style display
      this.currentLyrics = await this.client.getSynced(
        { track_name: track, artist_name: artist },
        { format: 'json', includeMetadata: true }
      );

      return results[0].metadata;
    } catch (error) {
      console.error('Failed to load track:', error);
      throw error;
    }
  }

  getCurrentLyrics(): FormattedLyrics | null {
    return this.currentLyrics;
  }
}
```

## 🔧 Configuration Options

### ClientOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableCache` | `boolean` | `true` | Enable response caching |
| `cacheTTL` | `number` | `300000` | Cache TTL in milliseconds (5 minutes) |
| `enableRateLimit` | `boolean` | `true` | Enable rate limiting |
| `maxRequestsPerMinute` | `number` | `60` | Maximum requests per minute |
| `requestTimeout` | `number` | `10000` | Request timeout in milliseconds |
| `userAgent` | `string` | `'lyrlib-api/1.0.0'` | User agent string for requests |

### SearchOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `10` | Maximum number of results |
| `include_metadata` | `boolean` | `true` | Include track metadata in results |
| `prefer_synced` | `boolean` | `false` | Prefer tracks with synced lyrics |

### LyricsOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `synced` | `boolean` | `false` | Fetch synced lyrics |
| `includeMetadata` | `boolean` | `true` | Include track metadata |
| `format` | `'plain' \| 'lrc' \| 'json'` | `'json'` | Output format |

## 🛠️ Development

### Prerequisites

- Node.js 16.0.0 or higher
- npm, yarn, or pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/ryxu-xo/lyrlib-api.git
cd lyrlib-api

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

### Scripts

- `npm run build` - Build the project
- `npm run dev` - Build in watch mode
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you have any questions or need help, please:

1. Check the [documentation](https://github.com/ryxu-xo/lyrlib-api#readme)
2. Search [existing issues](https://github.com/ryxu-xo/lyrlib-api/issues)
3. Create a [new issue](https://github.com/ryxu-xo/lyrlib-api/issues/new)

## 🙏 Acknowledgments

- [lrclib.net](https://lrclib.net) for providing the lyrics API
- [lrclib-api](https://github.com/igorwastaken/lrclib-api) for the original TypeScript wrapper
- All contributors and users of this library

---

Made with ❤️ for the music development community
