const mysql = require('mysql');
const axios = require('axios');
const squel = require('squel').useFlavour('mysql');
const fs = require('fs');

const configs = require('./configs.json');
const pubgStatsJson = require('./pubg-stats.json');
const mapNames = require('./mapName.json');
const { endConnectionHandler, DBHandlers } = require('./dbfunctions');
const api = require('./apis/pubg-api')(axios, configs.APIkey);
const steamApi = require('./apis/steam-api')(axios, configs.SteamAPIKey, configs.PUBGAppID);
const queries = require('./db-functions/queries')(squel);
const _queryFunctions = require('./db-functions/queryFunctions');
const _pubgApiHandlers = require('./pubg-api-handlers.js');
const RConClient = require('./rcon-client');
const { 
    generateMatchID, getAllPlayerMatches, sleep,
    RConClientRequest, RConResponseHandler
} = require('./utils');

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
        //await dbHandlers.samplesHandler();
        //fetching tournaments
        //await dbHandlers.tournamentsHandler();
        // fetching game schema
        //await dbHandlers.gameSchemaHandler();
        // fetch achievements %
        //await dbHandlers.globalAchievementsPercentagesHandler();
    
        /*api.getPlayer('WackyJacky101')
        .then(res => pubgApiHandlers.getPlayerHandler(res))
        .catch(getPlayerErr => {
            console.log('[!] Error while fetching player');
            console.error(getPlayerErr);
            DBConnection.end(endConnectionHandler);
        });*/
        // check if player stats are there in match object

        //const pid = 'account.c0e530e9b7244b358def282782f893af';
        /* api.getMatch('fbe2f131-ff96-4e19-83b8-ac2ad28335f3')
            .then(res => pubgApiHandler.getMatchHandler(res))
            .catch(getMatchErr => {
                console.error(getMatchErr);
            });
        */
        
        // test getPlayerSeasonStats
        /*await api.getPlayerSeasonStats(pid, 'division.bro.official.pc-2018-05')
            .then(res => pubgApiHandlers.getPlayerSeasonStatsHandler(res))
            .catch(fetchPlayerSeasonStatErr => {
                /*if(fetchPlayerSeasonStatErr.response.status === 404) {
                    // not found
                    return console.log(`[-] No season stats for ${fetchPlayerSeasonStatErr.request.path.split('/').pop()}`);
                }
                console.log('[x] Error while fetchig player season stats');
                //console.log(`[-] Request URL: ${fetchPlayerSeasonStatErr.request.path}`);
                //console.log(`[-] Response Status: ${fetchPlayerSeasonStatErr.response.status}`);
                console.error(fetchPlayerSeasonStatErr);
            })
            .finally(() => DBConnection.end(endConnectionHandler));*/
        /*await api.getSeasonLeaderboard('division.bro.official.pc-2018-01', 'solo')
            .then(res => pubgApiHandlers.getSeasonLeaderboardHandler(res))
            .catch(fetchSeasonLeaderboardErr => {
                console.log('[!] Error while trying to fetch leaderboard');
                console.error(fetchSeasonLeaderboardErr);
            })
            .finally(() => DBConnection.end(endConnectionHandler));*/
        
        // get the leaderboards for all season
        /*qfns.haveSeasonsCached(queries.seasons(), async (cacheErr, seasons) => {
            if(cacheErr) {
                console.log('[x] Error while fetching seasons');
                return ;
            }
            seasons = seasons.filter(s => s._id > 19)
            for(let season of seasons) {
                // get the seasons match info
                let gameModes = configs.GAME_MODES;
                for(let mode of gameModes) {
                    await api.getSeasonLeaderboard(season.season_id, mode)
                        .then(res => {
                            console.log(`[-] Fetched leaderboard for season: ${season.season_id} mode: ${mode}`);
                            const leaders = res.data.included;
                            qfns.insertSeasonsLeaderboard(queries.insertSeasonsLeaderboard(season._id, mode, leaders), (insErr) => {
                                if(insErr) {
                                    console.log('[x] Error while inserting leaderboard for ' + season.season_id + ' mode ' + mode);
                                    console.error(insErr);
                                    return ;
                                }
                                console.log(`Leaderboard for season: ${season.season_id} gameMode: ${mode} inserted`);
                            });
                        })
                        .catch(fetchSeasonLeaderboardError => {
                            let msg = `[x] Error while fetching leaderboards: ${season.season_id}  ${mode}`;
                            if(fetchSeasonLeaderboardError.response) {
                                console.log(msg.concat(`  ${fetchSeasonLeaderboardError.response.status}`));
                            }
                            //console.error(fetchSeasonLeaderboardError);
                        });
                    await sleep(7000) // sleep for 7 seconds; 10reqs/min
                };
            };
        });*/
        /*const statsReversed = pubgStatsJson.stats.reverse(); // since latest entry at the bottom
        DBConnection.query(queries.insertSteamPlayerStats(statsReversed), (err, res) => {
                if(err) {
                    console.log('[-] Error inserting steam player stats');
                    return console.error(err);
                }
                console.log('[*] Stats inserted successfully');
        });*/
        let plts = ['psn', 'kakao', 'xbox'];
        for(const p of plts) {
            let resSeas = await api.getSeasons(p);
            let seasons = resSeas.data.data;
            await new Promise((resolve, reject) => {
                DBConnection.query(queries.insertSeasons(seasons, p), (err) => {
                    if(err) {
                        console.log('[x] Error while getting seasons');
                        console.error(err);
                        //reject(err);
                    }
                    else {
                        console.log('[*] Got season');
                        resolve();
                    }
                })
            });
        }
    })();
    
});

