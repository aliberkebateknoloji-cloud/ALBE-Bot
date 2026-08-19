/**
 * ==========================================================
 *  ERROR EVENT
 * ----------------------------------------------------------
 *  Discord istemcisinde oluşan beklenmedik hataları konsola
 *  yazarak botun sessizce çökmesini engeller.
 * ==========================================================
 */

const { logger } = require('../utils/logger');

module.exports = {
    name: 'error',
    once: false,

    /**
     * @param {import('discord.js').Client} client
     * @param {Error} error
     */
    run(client, error) {
        logger.error(`Discord istemci hatası: ${error?.stack || error}`);
    },
};