/**
 * ==========================================================
 *  /AVATAR - Kullanıcının profil fotoğrafını gösterir
 * ==========================================================
 */

const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed } = require('../../utils/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Bir üyenin profil fotoğrafını gösterir.')
        .addUserOption((opt) => opt.setName('uye').setDescription('Fotoğrafı görüntülenecek üye')),

    async execute(interaction, client) {
        const user = interaction.options.getUser('uye') || interaction.user;
        const avatar = user.displayAvatarURL({ extension: 'png', size: 1024 });

        await interaction.reply({
            embeds: [
                buildEmbed({
                    title: `${user.tag}`,
                    color: 'infoColor',
                })
                    .setImage(avatar)
                    .addFields({
                        name: 'İndir',
                        value: `[PNG](${avatar})`,
                    }),
            ],
        });
    },
};