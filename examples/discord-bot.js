/**
 * Discord Bot Example using lyrlib-api
 * 
 * This example shows how to integrate lyrlib-api with a Discord bot
 * to provide lyrics functionality.
 */

const { Client } = require('lyrlib-api');
const { Client: DiscordClient, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

// Initialize the lyrics client
const lyricsClient = new Client({
  enableCache: true,
  cacheTTL: 600000, // 10 minutes
  enableRateLimit: true,
  maxRequestsPerMinute: 30,
});

// Discord bot client
const discordClient = new DiscordClient({ intents: ['Guilds', 'GuildMessages'] });

// Slash command for lyrics
const lyricsCommand = new SlashCommandBuilder()
  .setName('lyrics')
  .setDescription('Get lyrics for a song')
  .addStringOption(option =>
    option.setName('song')
      .setDescription('Song name')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('artist')
      .setDescription('Artist name')
      .setRequired(true)
  )
  .addBooleanOption(option =>
    option.setName('synced')
      .setDescription('Get synced lyrics (timestamped)')
      .setRequired(false)
  );

// Command handler
discordClient.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'lyrics') {
    await interaction.deferReply();

    try {
      const song = interaction.options.getString('song');
      const artist = interaction.options.getString('artist');
      const synced = interaction.options.getBoolean('synced') || false;

      // Search for the song
      const results = await lyricsClient.searchSong(
        { track_name: song, artist_name: artist },
        { limit: 1, include_metadata: true, prefer_synced: synced }
      );

      if (results.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Lyrics Not Found')
          .setDescription(`No lyrics found for "${song}" by ${artist}`)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const track = results[0].metadata;

      // Get lyrics
      const lyrics = synced
        ? await lyricsClient.getSynced(
            { track_name: song, artist_name: artist },
            { format: 'lrc', includeMetadata: false }
          )
        : await lyricsClient.getUnsynced(
            { track_name: song, artist_name: artist },
            { format: 'plain' }
          );

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`🎵 ${track.trackName}`)
        .setDescription(`by ${track.artistName}`)
        .addFields(
          { name: 'Album', value: track.albumName, inline: true },
          { name: 'Duration', value: `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`, inline: true },
          { name: 'Type', value: synced ? 'Synced (LRC)' : 'Plain Text', inline: true }
        )
        .setFooter({ text: 'Powered by lyrlib-api' })
        .setTimestamp();

      // Add lyrics (truncate if too long)
      const lyricsText = lyrics.content.length > 1000 
        ? lyrics.content.substring(0, 1000) + '...'
        : lyrics.content;

      embed.addFields({
        name: 'Lyrics',
        value: `\`\`\`${synced ? 'lrc' : ''}\n${lyricsText}\n\`\`\``
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching lyrics:', error);

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Error')
        .setDescription(`Failed to fetch lyrics: ${error.message}`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
});

// Bot ready event
discordClient.on('ready', () => {
  console.log(`Logged in as ${discordClient.user.tag}!`);
});

// Login (replace with your bot token)
discordClient.login('YOUR_BOT_TOKEN');

module.exports = { lyricsCommand };
