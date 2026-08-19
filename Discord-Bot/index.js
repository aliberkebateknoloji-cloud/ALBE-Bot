/**
 * ==========================================================
 *  ALBE BOT - Ana Giriş Dosyası (index.js)
 * ----------------------------------------------------------
 *  - Çevresel değişkenleri (.env) yükler
 *  - Discord.js v14 istemcisini intents ile oluşturur
 *  - Handler'ları yükler (komut / event / component)
 *  - MongoDB bağlantısını kurar ve botu başlatır
 * ==========================================================
 */

require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const config = require('./config.json');
const { logger } = require('./src/utils/logger');

// Handler fonksiyonları
const { commandHandler } = require('./src/handlers/commandHandler');
const { eventHandler } = require('./src/handlers/eventHandler');
const { componentHandler } = require('./src/handlers/componentHandler');

/**
 * Discord istemcisi.
 * İhtiyaç duyulan intentler özel olarak seçildi:
 * - Guilds: temel sunucu verileri
 * - GuildMembers: üye listesi / katılma olayları (priv. intent)
 * - GuildMessages + MessageContent: mesaj içerikleri
 * - GuildModeration: ban/timeout işlemleri
 * - GuildPresences: çevrimiçi üye sayacı (priv. intent)
 * - GuildVoiceStates: ses kanalları (kanal kilidi)
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Global erişilebilir veriler
client.config = config;              // config.json içeriği
client.dbEnabled = false;            // MongoDB bağlantı durumu
client.guardHits = new Map();        // Anti-raid katılım takibi (guildId -> zaman damgaları)

/**
 * MongoDB bağlantısı.
 * MONGO_URI tanımlı değilse bot DB servisleri olmadan çalışır.
 */
async function connectDatabase() {
    if (!process.env.MONGO_URI) {
        logger.warn('MONGO_URI tanımlı değil. DB bağlantılı servisler devre dışı kalacak.');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        client.dbEnabled = true;
        logger.success('MongoDB bağlantısı kuruldu.');
    } catch (error) {
        logger.error(`MongoDB bağlantı hatası: ${error.message}`);
    }
}

// Beklenmeyen hataların botu düşürmesini engelle
process.on('unhandledRejection', (error) =>
    logger.error(`Yakalanmamış Promise Hatası: ${error?.stack || error}`)
);
process.on('uncaughtException', (error) =>
    logger.error(`Yakalanmamış İstisna: ${error?.stack || error}`)
);

/**
 * Başlatma akışı:
 * 1) Handler'ları yükle (komutları/eventleri/client'e tanıt)
 * 2) Veritabanına bağlan
 * 3) Botu giriş yap
 */
(async () => {
    commandHandler(client);
    eventHandler(client);
    componentHandler(client);

    await connectDatabase();

    if (!process.env.TOKEN) {
        logger.error('TOKEN değeri .env dosyasında tanımlı değil!');
        process.exit(1);
    }

    logger.info('Bot giriş yapıyor...');
    client.login(process.env.TOKEN);
})();