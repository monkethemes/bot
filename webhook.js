const express = require('express');
const app = express();
const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');

app.use(express.json());

let themeMessages = new Map();

const dbPath = path.join(__dirname, 'data', 'themeMessages.json');

if (fs.existsSync(dbPath)) {
    const rawData = fs.readFileSync(dbPath);
    const jsonData = JSON.parse(rawData);

    themeMessages = new Map(jsonData);
}

function checkSecret(req, res, next) {
    const secret = req.headers['x-bot-secret'];

    if (!secret || secret !== process.env.X_BOT_SECRET) {
        return res.status(403).send('Unauthorized: Invalid or Missing X-BOT-SECRET');
    }

    next();
}

module.exports = function (client) {
    
    app.post('/theme-uploaded', checkSecret, async (req, res) => {
        const {
            themeId,
            title,
            description,
            userId,
            color,
            themeLink
        } = req.body;

        const fetch = (await import ('node-fetch')).default;

        const response = await fetch(`https://monkethemes.com/api/theme/extra/${themeId}`, {
            headers: {
                'X-BOT-SECRET': process.env.X_BOT_SECRET
            }
        });
        const data = await response.json();
        const username = data.username;
        const likes = data.likes;

        const colorDecimal = parseInt(color.replace('#', ''), 16);

        const channel = client.channels.cache.get(process.env.CHANNEL_ID);
        const embed = new Discord.EmbedBuilder()
            .setTitle(title)
            .setColor(colorDecimal)
            .setURL(`https://monkethemes.com/theme/${themeId}`)
            .addFields({
                name: 'Description',
                value: description ? description : 'No description provided.',
                inline: true
            }, {
                name: 'Uploader',
                value: `[${username}](https://monkethemes.com/user/${userId})`,
                inline: true
            })
            .setImage(`https://monkethemes.com/api/static/thumb/${themeId}.png`)
            .setFooter({text: 'monkethemes - post a theme with /upload', iconURL: 'https://cdn.discordapp.com/app-icons/1107264585838366802/9c439c4d18ba93e18f1f1f4603adf321.png?size=256'})
            .setTimestamp();

        const applyButton = new Discord.ButtonBuilder().setURL(themeLink).setLabel('🖌️ Apply Theme').setStyle(Discord.ButtonStyle.Link)
        const likeButton = new Discord.ButtonBuilder().setCustomId(`like_theme_${themeId}`).setLabel(`💛 ${likes}`).setStyle('Secondary');
        const row = new Discord.ActionRowBuilder().addComponents(applyButton, likeButton);

        const message = await channel.send({embeds: [embed], components: [row]});
        themeMessages.set(themeId, message.id);

        const jsonData = JSON.stringify(Array.from(themeMessages.entries()));
        fs.writeFileSync(dbPath, jsonData);

        res.sendStatus(200);
    });

    app.post('/theme-liked', checkSecret, async (req, res) => {
        const {themeId, likes} = req.body;

        const messageId = themeMessages.get(themeId);
        if (! messageId) {
            return res.status(404).send('Message not found');
        }

        const channel = client.channels.cache.get(process.env.CHANNEL_ID);
        const message = await channel.messages.fetch(messageId);
        const themeLink = JSON.stringify(message.components[0].components[0]).slice(8, -47);
        const applyButton = new Discord.ButtonBuilder().setURL(themeLink).setLabel('🖌️ Apply Theme').setStyle(Discord.ButtonStyle.Link);
        const likeButton = new Discord.ButtonBuilder().setCustomId(`like_theme_${themeId}`).setLabel(`💛 ${likes}`).setStyle('Secondary');
        const row = new Discord.ActionRowBuilder().addComponents(applyButton, likeButton);

        await message.edit({components: [row]});

        res.sendStatus(200);
    });

    app.post('/theme-edited', checkSecret, async (req, res) => {
        const {themeId, title, description} = req.body;
    
        const messageId = themeMessages.get(themeId);
        if (! messageId) {
            return res.status(404).send('Message not found');
        }
    
        const channel = client.channels.cache.get(process.env.CHANNEL_ID);
        const message = await channel.messages.fetch(messageId);

        const oldEmbed = message.embeds[0];

        const newFields = oldEmbed.fields.map((field, index) => 
            index === 0 
                ? { name: field.name, value: description, inline: field.inline }
                : field
        );

        const embed = new Discord.EmbedBuilder()
            .setTitle(title)
            .setColor(oldEmbed.color)
            .setURL(oldEmbed.url)
            .setFields(newFields)
            .setImage(oldEmbed.image ? oldEmbed.image.url : null)
            .setFooter({text: oldEmbed.footer.text, iconURL: oldEmbed.footer.iconURL})
            .setTimestamp(new Date(oldEmbed.timestamp));
    
        await message.edit({embeds: [embed]});
    
        res.sendStatus(200);
    });   
    
    app.post('/theme-deleted', checkSecret, async (req, res) => {
        const { themeId } = req.body;
        const messageId = themeMessages.get(themeId);
      
        if (!messageId) {
          return res.status(404).send('Message not found');
        }
      
        const channel = client.channels.cache.get(process.env.CHANNEL_ID);
        const message = await channel.messages.fetch(messageId);
      
        await message.delete();
      
        themeMessages.delete(themeId);
      
        const jsonData = JSON.stringify(Array.from(themeMessages.entries()));
        fs.writeFileSync(dbPath, jsonData);
      
        res.sendStatus(200);
      });

    client.on('interactionCreate', async (interaction) => {
        try {
            if (!interaction.isButton()) 
                return;
            

            const themeId = interaction.customId.replace('like_theme_', '');

            if (themeId) {
                console.log('Received interaction:', {
                    id: interaction.id,
                    customId: interaction.customId,
                    type: interaction.type,
                    user: interaction.user && interaction.user.id
                });

                await interaction.deferReply({ephemeral: true});

                const fetch = (await import ('node-fetch')).default;

                const userResponse = await fetch('https://monkethemes.com/api/bot/user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-BOT-SECRET': process.env.X_BOT_SECRET
                    },
                    body: JSON.stringify(
                        {
                            userId: interaction.user.id,
                            username: interaction.user.username,
                            avatarUrl: interaction.user.displayAvatarURL(
                                {format: 'png', dynamic: true}
                            )
                        }
                    )
                });

                const userData = await userResponse.json();

                const likeResponse = await fetch(`https://monkethemes.com/api/bot/like/${themeId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-BOT-SECRET': process.env.X_BOT_SECRET
                    },
                    body: JSON.stringify(
                        {userId: interaction.user.id}
                    )
                });

                const likeData = await likeResponse.json();

                const {likes, title} = likeData.theme;

                await fetch(`http://localhost:3000/webhook/theme-liked`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-BOT-SECRET': process.env.X_BOT_SECRET
                    },
                    body: JSON.stringify(
                        {themeId, likes}
                    )
                });

                const replyMessage = likeData.liked ? 'liked!' : 'unliked!';
                await interaction.editReply(`**${title}** theme ${replyMessage}`);
            }
        } catch (error) {
            console.error(`Failed to process interaction: ${
                error.message
            }`);
        }
    });

    return app;

};
