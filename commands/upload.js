const Discord = require('discord.js');

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('upload')
		.setDescription('Upload a theme to monkethemes.')
		.addStringOption(option =>
			option.setName('themeurl')
				.setDescription('The URL of the theme to upload')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('title')
				.setDescription('The title of the theme')
				.setRequired(true)
				.setMinLength(3)
				.setMaxLength(24))
		.addStringOption(option =>
			option.setName('description')
				.setDescription('The description of the theme')
				.setMaxLength(64)
				.setRequired(false)),
	async execute(interaction) {
		const fetch = (await import ('node-fetch')).default;

		const themeUrl = interaction.options.getString('themeurl');
		const title = interaction.options.getString('title');
		const description = interaction.options.getString('description');

		try {
			const userResponse = await fetch('https://monkethemes.com/api/bot/user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-BOT-SECRET': process.env.X_BOT_SECRET
				},
				body: JSON.stringify({
					userId: interaction.user.id,
					username: interaction.user.username,
					avatarUrl: interaction.user.displayAvatarURL(),
				}),
			});

			if (!userResponse.ok) {
				throw new Error(`HTTP error! status: ${userResponse.status}`);
			}

			const userJson = await userResponse.json();

			const themeResponse = await fetch('https://monkethemes.com/api/theme/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-BOT-SECRET': process.env.X_BOT_SECRET
				},
				body: JSON.stringify({
					userId: interaction.user.id,
					title: title,
					description: description,
					url: themeUrl
				}),
			});

			if (!themeResponse.ok) {
				throw new Error(`HTTP error! status: ${themeResponse.status}`);
			}

			const themeJson = await themeResponse.json();

			await interaction.reply({
				content: 'Theme upload successful!',
				ephemeral: true,
			});
		} catch (error) {
			console.error(`Error calling monkethemes API: ${error}`);
			await interaction.reply({
				content: 'Error uploading theme.',
				ephemeral: true,
			});
		}
	},
};
