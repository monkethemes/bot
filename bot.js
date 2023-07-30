const { Client, Collection, GatewayIntentBits } = require('discord.js');
const path = require('path');
const express = require('express');
const fs = require('fs');
const createWebhookApp = require('./webhook');

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
  console.log(`Bot is ready as: ${client.user.tag}`);

  const existingCommands = await client.application.commands.fetch();

  for (const [id, command] of existingCommands) {
    if (!client.commands.has(command.name)) {
      await client.application.commands.delete(id);
      console.log(`Unregistered command "${command.name}"`);
    }
    else {
      const botCommand = client.commands.get(command.name);
      if(JSON.stringify(botCommand.data.toJSON()) !== JSON.stringify(command)) {
        await client.application.commands.edit(id, botCommand.data);
        console.log(`Updated command "${command.name}"`);
      }
    }
  }

  for(const [name, botCommand] of client.commands) {
    if(!existingCommands.find(command => command.name === name)) {
      await client.application.commands.create(botCommand.data);
      console.log(`Registered command "${name}"`);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = interaction.commandName;

  if (!client.commands.has(command)) return;

  try {
    await client.commands.get(command).execute(interaction);
  } catch (error) {
    console.error(`Error executing command "${command}": ${error.message}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.channel.id === process.env.CHANNEL_ID && message.author.id !== client.user.id) {
    try {
      await message.delete();
      console.log(`Deleted message from ${message.author.tag} in channel ${message.channel.id}`);

      await message.author.send(`Discuss themes in <#732366092810453024> channel - post a theme with /upload`);
    } catch (error) {
      console.error(`Error deleting message: ${error}`);
    }
  }
});

const webhookApp = createWebhookApp(client);
const webhookServer = express();
webhookServer.use('/webhook', webhookApp);
webhookServer.listen(3000, () => console.log('Webhook Server is running'));

client.login(process.env.DISCORD_TOKEN);
