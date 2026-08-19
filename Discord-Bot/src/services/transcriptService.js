/**
 * ==========================================================
 *  TRANSCRIPT SERVİSİ
 * ----------------------------------------------------------
 *  Kapılan ticket kanallarındaki mesajları okuyup, şık bir
 *  HTML transkripti üretir. HTML dosyası botun /transcripts
 *  klasöründe saklanır ve arşiv kanalına gönderilir.
 * ==========================================================
 */

const { mkdirSync } = require('node:fs');
const { join } = require('node:path');

/** HTML içindeki özel karakterleri güvenli hale getirir (XSS koruması) */
function escapeHtml(value) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (c) => map[c]);
}

/** Tek bir mesajı HTML bloğuna çevirir */
function messageToHtml(message) {
    if (message.system) return '';

    const avatar = message.author.displayAvatarURL({ extension: 'png', size: 64 });
    const time = message.createdAt.toLocaleString('tr-TR');

    let body = '';
    if (message.content) {
        body += `<div class="content">${escapeHtml(message.content)}</div>`;
    }

    // Ekler (görselse görüntüle, değilse dosya adı ver)
    for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith('image/')) {
            body += `<img class="attachment" src="${attachment.url}" alt="${escapeHtml(attachment.name)}"/>`;
        } else {
            body += `<div class="attachment">📎 ${escapeHtml(attachment.name)}</div>`;
        }
    }

    // Embed önizlemesi
    if (message.embeds?.length) {
        const embed = message.embeds[0];
        const preview = embed.title || embed.description || embed.author?.name || 'Embed';
        body += `<div class="embed-preview">${escapeHtml(preview)}</div>`;
    }

    return `
        <div class="message">
            <img class="avatar" src="${avatar}" alt=""/>
            <div class="meta">
                <span class="author">${escapeHtml(message.author.username)}</span>
                <span class="time">${escapeHtml(time)}</span>
            </div>
            ${body}
        </div>`;
}

/**
 * Mesaj listesinden HTML transkript üretir ve dosyaya kaydeder.
 * @param {Array<import('discord.js').Message>} messages
 * @param {object} options { title, guildName, channelName }
 * @returns {Promise<string>} Kaydedilen dosyanın tam yolu
 */
async function generateTranscript(messages, { title = 'Transkript', guildName = 'Sunucu', channelName = 'Kanal' } = {}) {
    const body = messages.map(messageToHtml).join('\n');

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${escapeHtml(title)}</title>
    <style>
        :root { --bg: #1e1f22; --msg: #2b2d31; --text: #e0e0e0; --accent: #5865f2; }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: var(--text); font-family: 'Segoe UI', Roboto, sans-serif; }
        header { background: var(--accent); padding: 24px; }
        header h1 { margin: 0; font-size: 20px; }
        header p { margin: 6px 0 0; opacity: .85; font-size: 13px; }
        main { max-width: 860px; margin: 0 auto; padding: 20px; }
        .message { display: flex; gap: 12px; padding: 10px 12px; border-radius: 8px; background: var(--msg); margin-bottom: 8px; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
        .meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
        .author { font-weight: 700; color: #ffffff; }
        .time { font-size: 11px; opacity: .6; }
        .content { white-space: pre-wrap; word-break: break-word; }
        .attachment { max-width: 320px; border-radius: 6px; margin-top: 4px; font-size: 13px; }
        .embed-preview { border-left: 3px solid var(--accent); padding: 8px 12px; background: #232428; border-radius: 4px; margin-top: 6px; font-size: 13px; }
        footer { text-align: center; padding: 20px; opacity: .5; font-size: 12px; }
    </style>
</head>
<body>
    <header>
        <h1>🎫 ${escapeHtml(title)}</h1>
        <p>Sunucu: ${escapeHtml(guildName)} &nbsp;•&nbsp; Kanal: #${escapeHtml(channelName)} &nbsp;•&nbsp; ${messages.length} mesaj</p>
    </header>
    <main>
        ${body}
    </main>
    <footer>Bu transkript Albe Bot tarafından ${new Date().toLocaleString('tr-TR')} tarihinde oluşturuldu.</footer>
</body>
</html>`;

    // transkriptleri /transcripts klasörüne kaydet
    const dir = join(__dirname, '..', '..', 'transcripts');
    mkdirSync(dir, { recursive: true });

    const filename = `transcript-${Date.now()}.html`;
    const filePath = join(dir, filename);

    const { writeFile } = require('node:fs/promises');
    await writeFile(filePath, html, 'utf-8');

    return filePath;
}

module.exports = { generateTranscript, escapeHtml };