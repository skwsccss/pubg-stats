const mysql = require('mysql');
const squel = require('squel').useFlavour('mysql');
const moment = require('moment');
const winston = require('winston');
const axios = require('axios');
// monkey patch winston
require('winston-daily-rotate-file');

/////// CONFIG FILES    \\\\\\\\\\\\\\\\\\\\\
const configs = require('./configs.json');
const pubgStatsJson = require('./pubg-stats.json');
const mapNames = require('./mapName.json');

const MYSQL_POOL_MAX_CONNECTIONS = 5; 

/////// LOGGER  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
const transport = new winston.transports.DailyRotateFile({
    filename: 'up-log-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '30'
});
const logger = winston.createLogger({
    transports: [ transport ]
});

const pubgApi = require('./apis/pubg-api')(axios, configs.APIkey);
const queries = require('./db-functions/queries')(squel);
const _queryFunctions = require('./db-functions/queryFunctions');
const _pubgApiHandlers = require('./pubg-api-handlers');
const { 
    generateMatchID, getAllPlayerMatches, sleep,
} = require('./utils');
const _updater = require('./update');

const DBPool = mysql.createPool({
    connectionLimit: MYSQL_POOL_MAX_CONNECTIONS,
    host: configs.DBHOST,
    user: configs.DBUSER,
    password: configs.DBPASS,
    database: configs.DBNAME
});

const queryFns = _queryFunctions(DBPool);
const pubgApiHandlers = _pubgApiHandlers(queryFns, queries);
const updater = _updater(DBPool, queries, pubgApi, pubgApiHandlers, logger, sleep);

(async () => {
    // the update loop
    try {
        //await updater.updateLeaderboards();
        await updater.updateSeasons();
        console.log('[*] update runner is sleeping for 10 s');
        await sleep(10000); // 10 s
        
        console.log('[*] All database updated successfully');
        DBPool.end(e => console.error(e));
    } catch(upErr) {
        console.error(upErr);
    }
})();
