/**
 * ==========================================================
 *  /PING - Bot gecikme sürelerini gösterir
 * ==========================================================
 */

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../../utils/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun gecikme sürelerini gösterir.'),

    async execute(interaction, client) {
        const sent = Date.now();
        await interaction.deferReply();

        // Mesaj gecikmesini ölç
        await interaction.editReply({ embeds: [info('Ölçülüyor', '...')] });
        const roundTrip = Date.now() - sent;

        await interaction.editReply({
            embeds: [
                info('Pong! 🏓', 'Bağlantı bilgileri').addFields(
                    { name: '💠 Mesaj Gecikmesi', value: `${roundTrip}ms`, inline: true },
                    { name: '📡 API Gecikmesi', value: `${Math.round(client.ws.ping)}ms`, inline: true }
                ),
            ],
        });
    },
};