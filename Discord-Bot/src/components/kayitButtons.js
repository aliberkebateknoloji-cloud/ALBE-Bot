/**
 * ==========================================================
 *  KAYIT (REGISTRATION) COMPONENT DOSYASI
 * ----------------------------------------------------------
 *  /kayit panel komutuyla gönderilen butonların işlenmesi:
 *  - "kayit_yes" : üyeyi kayıtlı üye rolüne atar
 *  - "kayit_no"  : üyeyi kayıt altı rolüne atar / bilgilendirir
 * ==========================================================
 */

const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getGuild } = require('../utils/guild');
const { logger } = require('../utils/logger');

/**
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').ButtonInteraction} interaction
 * @returns {Promise<boolean>}
 */
async function run(client, interaction) {
    if (!interaction.isButton()) return false;

    if (interaction.customId !== 'kayit_yes' && interaction.customId !== 'kayit_no') {
        return false;
    }

    if (!client.dbEnabled) {
        await interaction.reply({ content: 'Kayıt sistemi için veritabanı bağlantısı gerekli.', ephemeral: true });
        return true;
    }

    const guild = interaction.guild;
    const doc = await getGuild(guild.id);
    const member = interaction.member;

    const memberRoleId = doc.kayitMemberRoleId;
    const unregisteredRoleId = doc.kayitUnregisteredRoleId;

    // Rol izni kontrolü: bot yeterli rol hiyerarşisine sahip mi?
    const canAssign = (roleId) => {
        const role = guild.roles.cache.get(roleId);
        return role && guild.members.me.roles.highest.comparePositionTo(role) > 0;
    };

    if (interaction.customId === 'kayit_yes') {
        if (!memberRoleId || !canAssign(memberRoleId)) {
            await interaction.reply({
                content: 'Kayıt rolü ayarlanmamış veya bot rolüm bu rolün üzerinde değil. Lütfen bir yetkiliye haber ver.',
                ephemeral: true,
            });
            return true;
        }

        // Zaten kayıtlı mı?
        if (member.roles.cache.has(memberRoleId)) {
            await interaction.reply({ content: 'Zaten kayıtlısın.', ephemeral: true });
            return true;
        }

        try {
            await member.roles.add(memberRoleId, 'Kayıt sistemi: onaylandı');
            // Kayıtsız rolü varsa kaldır
            if (unregisteredRoleId && canAssign(unregisteredRoleId)) {
                await member.roles.remove(unregisteredRoleId).catch(() => {});
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.embeds.successColor)
                        .setTitle(`${client.config.emoji.success} Kayıt Tamamlandı`)
                        .setDescription(`Tebrikler, sunucuya kaydın onaylandı!`),
                ],
                ephemeral: true,
            });
        } catch (error) {
            logger.error(`Kayıt onayı hatası: ${error.message}`);
            await interaction.reply({ content: 'Kayıt işlemi sırasında bir hata oluştu.', ephemeral: true });
        }
        return true;
    }

    // kayit_no
    if (unregisteredRoleId && canAssign(unregisteredRoleId)) {
        await member.roles.add(unregisteredRoleId).catch(() => {});
    }
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(client.config.embeds.infoColor)
                .setTitle('Bilgilendirme')
                .setDescription('Kayıt işlemini tamamlamak için lütfen "Kayıt Ol" butonuna basın.'),
        ],
        ephemeral: true,
    });
    return true;
}

module.exports = { run };