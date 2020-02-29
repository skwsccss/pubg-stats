const mysql = require('mysql');
const axios = require('axios');
const squel = require('squel').useFlavour('mysql');

const configs = require('./configs.json');
const mapNames = require('./mapName.json');
const { endConnectionHandler, DBHandlers } = require('./dbfunctions');
const api = require('./pubg-api')(axios, configs.APIkey);
const steamApi = require('./steam-api')(axios, configs.SteamAPIKey, configs.PUBGAppID);
const queries = require('./queries')(squel);
const _queryFunctions = require('./queryFunctions');
const _pubgApiHandlers = require('./pubg-api-handlers.js');
const { generateMatchID, getAllPlayerMatches } = require('./utils');

// MYSQL 
const DBConnection = mysql.createConnection({
    host: configs.DBHOST,
    user: configs.DBUSER,
    password: configs.DBPASS,
    database: configs.DBNAME
});

DBConnection.connect((connectionError) => {
    if(connectionError) {
        console.log('[!] Fatal Error: Could not connect to database');
        console.error(connectionError);
        DBConnection.end(endConnectionHandler);
        process.exit(1);
    }
    const qfns = _queryFunctions(DBConnection);
    const pubgApiHandlers = _pubgApiHandlers(qfns, queries);
    const dbHandlers = DBHandlers(DBConnection, qfns, queries, pubgApiHandlers);
    
    // the main invocation context
    (async () => {
        // fetching samples
        await dbHandlers.samplesHandler();
        //fetching tournaments
        await dbHandlers.tournamentsHandler();
        // fetching game schema
        await dbHandlers.gameSchemaHandler();
        // fetch achievements %
        await dbHandlers.globalAchievementsPercentagesHandler();
    
        /*api.getPlayer('WackyJacky101')
        .then(res => pubgApiHandlers.getPlayerHandler(res))
        .catch(getPlayerErr => {
            console.log('[!] Error while fetching player');
            console.error(getPlayerErr);
            DBConnection.end(endConnectionHandler);
        });*/
        // check if player stats are there in match object

        const pid = 'account.c0e530e9b7244b358def282782f893af';
        /* api.getMatch('fbe2f131-ff96-4e19-83b8-ac2ad28335f3')
            .then(res => pubgApiHandler.getMatchHandler(res))
            .catch(getMatchErr => {
                console.error(getMatchErr);
            });
        */
        
        // test getPlayerSeasonStats
        await api.getPlayerSeasonStats(pid, 'division.bro.official.pc-2018-05')
            .then(res => pubgApiHandlers.getPlayerSeasonStatsHandler(res))
            .catch(fetchPlayerSeasonStatErr => {
                /*if(fetchPlayerSeasonStatErr.response.status === 404) {
                    // not found
                    return console.log(`[-] No season stats for ${fetchPlayerSeasonStatErr.request.path.split('/').pop()}`);
                }*/
                console.log('[x] Error while fetchig player season stats');
                //console.log(`[-] Request URL: ${fetchPlayerSeasonStatErr.request.path}`);
                //console.log(`[-] Response Status: ${fetchPlayerSeasonStatErr.response.status}`);
                console.error(fetchPlayerSeasonStatErr);
            })
            .finally(() => DBConnection.end(endConnectionHandler));
    })();
});

