const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('postmissing')
        .setDescription('Post every theme missing from index'),
    async execute(interaction) {
        const fetch = (await import ('node-fetch')).default;

        const authorizedUserId = '';
        if (interaction.user.id !== authorizedUserId) {
            console.log(`Unauthorized user: ${interaction.user.id}`);
            await interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
            return;
        }

        try {
            const response = await fetch('https://monkethemes.com/api/bot/themes', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-BOT-SECRET': process.env.X_BOT_SECRET
                }
            });

            if (!response.ok) {
                console.log(`An error has occurred: ${response.status}`);
                await interaction.reply({ content: 'An error occurred while fetching themes.', ephemeral: true });
                return;
            }

            const themes = await response.json();

            const themeMessagesPath = path.resolve(__dirname, '../data/themeMessages.json');
            const themeMessagesData = fs.readFileSync(themeMessagesPath, 'utf-8');
            const themeMessages = JSON.parse(themeMessagesData);

            const newThemes = themes.filter(theme => !themeMessages.some(([themeId]) => themeId === theme._id));

            for (const theme of newThemes) {
                const {
                    _id: themeId,
                    title,
                    description,
                    userId,
                    themeData: {
                        c: [color]
                    },
                    url: themeLink
                } = theme;

                await fetch('http://localhost:3000/webhook/theme-uploaded', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-BOT-SECRET': process.env.X_BOT_SECRET
                    },
                    body: JSON.stringify(
                        {
                            themeId,
                            title,
                            description,
                            userId,
                            color,
                            themeLink
                        }
                    )
                });
            }

            console.log(`Posted ${newThemes.length} new themes to the theme-uploaded webhook`);
            await interaction.reply({ content: `Posted ${newThemes.length} new themes to the webhook`, ephemeral: true });
        } catch (error) {
            console.log('Failed to fetch themes:', error);
            await interaction.reply({ content: 'Failed to fetch themes.', ephemeral: true });
        }
    }
};
