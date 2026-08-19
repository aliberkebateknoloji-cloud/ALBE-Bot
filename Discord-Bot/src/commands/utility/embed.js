/**
 * ==========================================================
 *  /EMBED - Özel donanımlı embed mesajı gönderir
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Özel donanımlı bir embed mesajı gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addStringOption((opt) =>
            opt.setName('baslik').setDescription('Embed başlığı').setRequired(true)
        )
        .addStringOption((opt) =>
            opt.setName('aciklama').setDescription('Embed açıklaması (alt satırlarda uzunluğunu yazabilirsin)')
        )
        .addStringOption((opt) =>
            opt.setName('renk').setDescription('Renk kısayolu veya HEX kodu (örn: success, #ff0000)')
        )
        .addStringOption((opt) => opt.setName('footer').setDescription('Footer metni'))
        .addBooleanOption((opt) => opt.setName('gizli').setDescription('Mesajı yalnızca sana göster'))
        .addChannelOption((opt) => opt.setName('kanal').setDescription('Mesajın gönderileceği kanal')),

    async execute(interaction, client) {
        const title = interaction.options.getString('baslik');
        const description = interaction.options.getString('aciklama') || null;
        const colorInput = interaction.options.getString('renk');
        const footerText = interaction.options.getString('footer');
        const hidden = interaction.options.getBoolean('gizli') ?? false;
        const channel = interaction.options.getChannel('kanal') || interaction.channel;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageMessages, 'Mesajları Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        // Renk çözümleme: kısayol (success/info...) veya HEX
        let color = client.config.embeds.defaultColor;
        if (/^#([0-9a-f]{6})$/i.test(colorInput || '')) {
            color = colorInput;
        } else if (colorInput && client.config.embeds[`${colorInput}Color`]) {
            color = client.config.embeds[`${colorInput}Color`];
        }

        await channel.send({
            embeds: [
                {
                    color,
                    title,
                    description,
                    footer: { text: footerText || client.config.embeds.footerText },
                    timestamp: new Date(),
                },
            ],
        });

        await interaction.reply({
            embeds: [success('Mesaj Gönderildi', `Embed <#${channel.id}> kanalına gönderildi.`)],
            ephemeral: true,
        });
    },
};