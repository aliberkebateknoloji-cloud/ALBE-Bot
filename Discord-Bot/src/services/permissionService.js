/**
 * ==========================================================
 *  PERMISSION SERVİSİ
 * ----------------------------------------------------------
 *  Komutlardaki yetki kontrolü ve rol hiyerarşisi doğrulama
 *  mantığını merkezileştirir.
 * ==========================================================
 */

const { PermissionsBitField, GuildMember } = require('discord.js');

/**
 * Üyenin gerekli yetkiye sahip olup olmadığını kontrol eder.
 * @param {GuildMember} member
 * @param {PermissionsBitField} permission
 * @param {string} label Yetkinin okunur adı (ör. "Üyeleri Yasakla")
 * @returns {string|null} Yetki yoksa hata metni, varsa null
 */
function requirePermission(member, permission, label) {
    if (!(member instanceof GuildMember) || !member.permissions) {
        return 'Üye bilgisi doğrulanamadı.';
    }
    if (!member.permissions.has(permission)) {
        return `Bu komutu kullanmak için **${label}** yetkisine sahip olman gerekir.`;
    }
    return null;
}

/**
 * Bot'un gerekli sunucu yetkisine sahip olup olmadığını kontrol eder.
 * @param {import('discord.js').Guild} guild
 * @param {PermissionsBitField} permission
 * @param {string} label
 * @returns {string|null}
 */
function requireBotPermission(guild, permission, label) {
    if (!guild.members.me || !guild.members.me.permissions.has(permission)) {
        return `İşlemi gerçekleştirebilmem için bana **${label}** yetkisi verilmelidir.`;
    }
    return null;
}

/**
 * Yürütücünün hedef üyeyi işleme tabi tutup tutamayacağını kontrol eder.
 * Rol hiyerarşisi kuralı: sadece kendinden DÜŞÜK rollere işlem yapılabilir.
 * @param {GuildMember} executor Yürütücü
 * @param {GuildMember} target Hedef üye
 * @returns {string|null}
 */
function hierarchyError(executor, target) {
    if (!executor || !target) return 'Hedef üye bulunamadı.';

    if (target.id === executor.id) {
        return 'Kendine bu işlemi uygulayamazsın.';
    }

    if (target.id === target.guild.ownerId) {
        return 'Sunucu sahibine bu işlemi uygulayamazsın.';
    }

    if (!target.moderatable) {
        return 'Hedef üye, bot rollerinin üzerinde veya korunuyor. Önce bot rolünü hedef rolün üzerine taşı.';
    }

    if (executor.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
        return 'Bu işlemi gerçekleştirmek için hedef üyenin rolünden **daha yüksek** bir role sahip olmalısın.';
    }

    return null;
}

module.exports = { requirePermission, requireBotPermission, hierarchyError };