/**
 * ==========================================================
 *  INTERACTION CREATE EVENT
 * ----------------------------------------------------------
 *  Tüm etkileşimlerin (slash komut, buton, menü, modal)
 *  dağıtım merkezi.
 * ==========================================================
 */

const { Events } = require('discord.js');
const { buildEmbed } = require('../utils/embed');
const { logger } = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').BaseInteraction} interaction
     */
    async run(client, interaction) {
        // Sunucu üyesinin cache'e yüklenmesini garanti et
        // (interaction.member getter'ı cache'ten okur, bu yüzden warm-up fetch yapıyoruz)
        if (interaction.inGuild() && interaction.member === null) {
            try {
                await interaction.guild.members.fetch(interaction.user.id);
            } catch {
                return interaction.reply({
                    embeds: [buildEmbed({ title: 'Hata', description: 'Üye bilgisi alınamadı.', color: 'errorColor' })],
                    ephemeral: true,
                });
            }
        }

        // --- Slash komutları ---
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                return interaction.reply({
                    embeds: [buildEmbed({ title: 'Hata', description: 'Komut bulunamadı. Komutlar yeniden yüklenmeli.', color: 'errorColor' })],
                    ephemeral: true,
                });
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.error(`Komut hatası (/${interaction.commandName}): ${error.stack || error}`);
                const payload = {
                    embeds: [buildEmbed({ title: 'Hata', description: `Komut çalıştırılırken bir hata oluştu.\n\`${error.message}\``, color: 'errorColor' })],
                    ephemeral: true,
                };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(payload).catch(() => {});
                } else {
                    await interaction.reply(payload).catch(() => {});
                }
            }
            return;
        }

        // --- Buton / Menü / Modal ---
        if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
            for (const component of client.components) {
                try {
                    const handled = await component.run(client, interaction);
                    if (handled) return;
                } catch (error) {
                    logger.error(`Component hatası (${interaction.customId}): ${error.stack || error}`);
                    const payload = {
                        embeds: [buildEmbed({ title: 'Hata', description: `İşlem sırasında bir hata oluştu.\n\`${error.message}\``, color: 'errorColor' })],
                        ephemeral: true,
                    };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(payload).catch(() => {});
                    } else {
                        await interaction.reply(payload).catch(() => {});
                    }
                    return;
                }
            }
        }
    },
};