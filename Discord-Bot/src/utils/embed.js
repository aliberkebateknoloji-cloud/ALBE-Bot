/**
 * ==========================================================
 *  EMBED YARDIMCISI
 * ----------------------------------------------------------
 *  config.json içindeki renkler / başlıklar / footer metinleri
 *  otomatik olarak embed'lere uygulanır. Böylece tüm bot
 *  tek bir yerden özelleştirilebilir.
 * ==========================================================
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

/** @returns {string} Renk kısayolunu HEX renge çevirir veya geçerli HEX döndürür */
function getColor(key) {
    if (!key) return config.embeds?.defaultColor || '#5865F2';
    if (config.embeds && config.embeds[key]) {
        return config.embeds[key];
    }
    return key;
}

/** @returns {string} Embed başlığını topic verisinden üretir */
function getTitle(key, emojiKey) {
    const title = config.embeds?.titles?.[key] || key;
    const emoji = config.emoji?.[emojiKey] || 'ℹ️';
    return `${emoji} ${title}`;
}

/**
 * Üst düzey embed oluşturucu.
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {string} [options.color] Renk kısayolu (defaultColor/successColor/...) veya HEX
 * @param {Array}  [options.fields]
 * @param {boolean} [options.timestamp]
 * @param {object} [options.footer]
 */
function buildEmbed({ title, description, color, fields = [], timestamp = false, footer } = {}) {
    const finalColor = getColor(color);
    
    const embed = new EmbedBuilder()
        .setColor(finalColor);

    const footerText = footer?.text || config.embeds?.footerText;
    const footerIcon = footer?.icon || config.embeds?.footerIcon;

    if (footerText) {
        embed.setFooter({
            text: footerText,
            iconURL: footerIcon && footerIcon.trim() !== '' ? footerIcon : undefined
        });
    }

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (Array.isArray(fields) && fields.length > 0) embed.addFields(fields);
    if (timestamp) embed.setTimestamp();

    return embed;
}

function success(title, description, opts = {}) {
    return buildEmbed({ ...opts, title, description, color: 'successColor' });
}

function error(title, description, opts = {}) {
    return buildEmbed({ ...opts, title, description, color: 'errorColor' });
}

function warning(title, description, opts = {}) {
    return buildEmbed({ ...opts, title, description, color: 'warningColor' });
}

function info(title, description, opts = {}) {
    return buildEmbed({ ...opts, title, description, color: 'infoColor' });
}

module.exports = { buildEmbed, success, error, warning, info, getColor, getTitle };