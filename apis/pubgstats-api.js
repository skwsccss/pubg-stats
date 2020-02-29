/*
    * The core REST API definition 
    * for pubgstats.info
    * ----------------------------
    * Author: Abrar H Galib
*/
module.exports = function(express, pool, queries, queryFns, pubgApi, pubgApiHandlers, cache, logger) {
    const api = express.Router();

    api.post('/*', async (req, res, nxt) => {
        /*
            * For handling cookie for all endpoints that deal with player
            * Lookup up the ID once and save it as a cookie 
        */
        const pattern = /[p|P]layer/;
        // check if the request is for *player* endpoint
        console.log('OG: ' + req.originalUrl);
        if(req.originalUrl.search(pattern) === -1) {
            // don't lookup player
            console.log('Not players endpoint');
            nxt();
        }
        else {
            console.log('Req.body');
            console.log(req.body);
           if(req.body && req.body.playerName) {
                // lookup player
                console.log('Fetching ID for session');
                const resPlayer = await pubgApi.getPlayer(req.body.playerName);
                const playerId = pubgApiHandlers.getPlayerHandler(resPlayer);
                if(!playerId) {
                    // throw an error
                    return res.json({
                        status: 404,
                        message: 'No such player found'
                    });
                }
                else {
                    req.body.playerId = playerId;
                    console.log('Session');
                    console.log(req.session);
                    nxt();
                }
            }
             
        }
    });

    api.post('/getTopLeadersBySeason', async (req, res, nxt) => {
        /*
            * Returns a set of user from past and current leaderboard 
            * from the database.
        */
        let { gameMode, seasonId, platform, count } = req.body;
        
        try{
            const resLeaders = await pubgApi.getSeasonLeaderboard(seasonId, gameMode, 0, platform);
            const leaders = await pubgApiHandlers.getSeasonLeaderboardHandler(resLeaders);
            const leadersSpl = leaders.splice(0, 10);
            res.json({
                status: 200,
                leaders: leadersSpl
            });
        } catch(e) {
            console.log('[x] Error while fetching leaderboard');
            console.error(e);
            if(e.response && e.response.status && e.response.status === 404) {
                res.json({
                    status: 404,
                    message: 'No such leaderboard found'
                });
            }
            else {
                res.json({
                    status: 500,
                    message: 'Something went wrong'
                });
            }
        }
    });
    api.get('/getSeasons/:platform', async (req, res, nxt) => {
        /*
            * Returns the database ID and the season_id
            * for all available seasons. 
            * Note: no data before 2018-01
        */
       let  { platform } = req.params;
       if(platform && platform === 'steam') platform = ''; // steam table has no platform identifier
       console.log(`P: ${platform}`);
       pool.query(queries.seasons(platform), (err, seas) => {
           if(err) {
               console.error(err);
           }
           else {
               seas = seas.map(s => { 
                   return { ...s, is_current: s.is_current ? true : false };
               });
               console.log(seas);
               res.json({
                   status: 200,
                   seasons: seas
               });
           }
       });
    });
    api.post('/getPlayerSeasonLifetimeStats', async (req, res, nxt) => {
        /*
            * Returns the lifetime stats for a player.
            * Required params are playerName, seasonId
            * Note: seasonId is already cached in front end
        */
        const { seasonId, platform, playerId } = req.body;
        console.log(`PlayerId: ${playerId}  SeasonId: ${seasonId}  Platform: ${platform}`);
        if(!seasonId || !playerId || !platform) {
            return res.json({
                status: 400,
                message: 'PlayerName and/or seasonId cannot be undefined'
            });
        }
        try{
            const resPlayerStats = await pubgApi.getPlayerSeasonStats(playerId, seasonId, platform);
            const { gameModeStats, matches, name } = 
                pubgApiHandlers.getPlayerSeasonLifetimeStatsHandler(resPlayerStats);
            // name is undefined
            //cache.setPlayerMatches(playerName, matches);
            console.log(gameModeStats);
            /*res.json({
                status: 200,
                stats: gameModeStats
            });*/
            res.json({
                status: 200,
                stats: gameModeStats
            });
        } catch(e) {
            if(e.response && e.response.status && e.response.status === 404) {
                res.json({
                    status: 404,
                    message: 'No such player found'
                });
            }
        }
    });
    api.post('/getPlayerSeasonMatches', async (req, res, nxt) => {
        const { playerId, playerName } = req.session;
        console.log('Pname: ' + playerName)
        let { seasonId, gameMode, page } = req.body;
        if(!gameMode) {
            return res.json({
                status: 400,
                message: 'gameMode is undefined'
            });
        }
        if(!page) page = 0; // used for pagination
        if(!seasonId) {
            // check cache
            const matches = cache.getPlayerMatches(playerId);
            if(!matches) {
                return res.json({
                    status: 400,
                    message: 'No matches cached and no seasonId provided.'
                });
            }
            else {
                const m = [];
                for(let mat of matches) {
                    let resMatch = await pubgApi.getMatch(mat.id);
                    let matchDetails = pubgApiHandlers.getMatchHandler(resMatch);
                    m.push(matchDetails);
                }
                return res.json({
                    status: 200,
                    matches: m
                });
            }
        }
        else {
            // get the matches
            //const resPlayer = await pubgApi.getPlayer(playerName);
            //const playerId = pubgApiHandlers.getPlayerHandler(resPlayer);
            console.log(playerId);
            const resPlayerStats = await pubgApi.getPlayerSeasonStats(playerId, seasonId);
            let { matches } = 
                pubgApiHandlers.getPlayerSeasonLifetimeStatsHandler(resPlayerStats);
            // name is undefined
            cache.setPlayerMatches(playerName, matches);
            if(!matches[gameMode]) {
                return res.json({
                    status: 200,
                    message: 'No data found for gameMode ' + gameMode
                });
            }
            let pages = matches[gameMode].data;
            pages = pages.slice(page, (page+5 > page.length ? page.length : page+5));

            const m = [];
            for(const pg of pages) {
                // fetch each match
                console.log(`matchid: ${pg.id}`);
                let resMatch = await pubgApi.getMatch(pg.id);
                let matchDetails = pubgApiHandlers.getMatchHandler(resMatch, playerId);
                m.push(matchDetails);
            }
            return res.json({
                status: 200,
                matches: m
            });
        }
    });
    api.post('/getPlayerWeaponSummaries', async (req, res, nxt) => {
        /*
            * Returns the summary of weapons for a player
            * Note: playerId is assumed to be known
        */
        const { playerId, platform } = req.body;
        if(!playerId || !platform) {
            return res.json({
                status: 400,
                message: 'Player ID cannot be undefined'
            });
        }
        const resSummaries = await pubgApi.getWeaponsMastery(playerId, platform);
        const summaries = pubgApiHandlers.getWeaponsMasteryHandler(resSummaries);
        if(!summaries) {
            // not found
            return res.json({
                status: 404,
                message: 'No weapons stats found'
            });
        }
        res.json({
            status: 200,
            summaries
        });
    });
    api.get('/getActivePlayers/', async (req, res, nxt) => {
        try{
            const stats = await new Promise((resolve, reject) => {
                pool.query(queries.getSteamPlayerStats(), (err, stats) => {
                    if(err) {
                        reject(err);
                    }
                    else {
                        resolve(stats);
                    }
                });
            });
            res.json({
                status: 200,
                stats: stats
            });
        } catch(ferr) {
            console.log('[x] Error while fetching steam player stats from db');
            console.error(ferr);
            return res.json({
                status: 500,
                message: 'Something went wrong'
            });
        }
    });

    return api;
};