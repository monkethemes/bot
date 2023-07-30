const Discord = require('discord.js');

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong and latency!'),
	async execute(interaction) {
		await interaction.deferReply({ephemeral: true});
		const latency = Date.now() - interaction.createdTimestamp;
		await interaction.editReply(`Pong! That took ${latency}ms.`);
	},
};
