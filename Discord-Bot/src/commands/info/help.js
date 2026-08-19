/**
 * ==========================================================
 *  /HELP - Komutları kategorilere göre listeler
 * ==========================================================
 */

const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed } = require('../../utils/embed');

/** Kategori adlarını okunur başlığa çevirir */
const categoryLabel = (key) => {
    const map = {
        moderation: '🛠️ Moderasyon',
        guard: '🛡️ Guard / Koruma',
        ticket: '🎫 Ticket Sistemi',
        setup: '⚙️ Sunucu Ayarları',
        info: 'ℹ️ Bilgi',
        utility: '🧰 Araçlar',
    };
    return map[key] || key;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Tüm komutların listesini gösterir.'),

    async execute(interaction, client) {
        // Komutları kategorilere göre grupla
        const groups = new Map();
        for (const [name, command] of client.commands) {
            const cat = command.category || 'diğer';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(name);
        }

        const fields = [...groups.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, commands]) => ({
                name: categoryLabel(cat),
                value: commands.map((c) => `\`/${c}\``).join(' '),
            }));

        await interaction.reply({
            embeds: [
                buildEmbed({
                    title: `${client.config.emoji.info} Komut Listesi`,
                    description: `Toplam **${client.commands.size}** komut mevcut.`,
                    color: 'defaultColor',
                    fields,
                    timestamp: true,
                }),
            ],
        });
    },
};