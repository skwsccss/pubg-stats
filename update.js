/*
    * Returns a set of update functions that 
    * are run after long timeouts
*/
module.exports = function(pool, queries, pubgApi, pubgApiHandlers, logger, sleep) {
    const platforms = ['steam', 'psn', 'kakao', 'xbox'];
    const gameModes = ['solo'];

    return {
        updateLeaderboards: async () => {
            // get seasons
            try {
                for(const plat of platforms) {
                    const seasons = await new Promise((resolve, reject) => {
                        pool.query(queries.seasons(plat), (err, seas) => {
                            if(err) {
                                reject(err);
                            }
                            else {
                                resolve(seas);
                            }
                        });
                    });
                    if(seasons && seasons.length && seasons.length > 0) {
                        // get leaderboards
                        for(const s of seasons) {
                            try {
                                let page = 0;
                                for(const mode of gameModes) {
                                    if(page === 2) {
                                        page = 0;
                                    }
                                    console.log(`[-] ${s.season_id}  ${mode}  ${page}  ${plat}`);
                                    const resLead = await pubgApi.getSeasonLeaderboard(
                                        s.season_id, mode, page, plat 
                                    );
                                    const leads = pubgApiHandlers.getSeasonLeaderboardHandler(resLead);
                                    // insert into db
                                    pool.query(queries.insertSeasonsLeaderboard(s._id, mode, plat, leads), (ierr, done) => {
                                        if(ierr) {
                                            console.error(ierr);
                                        }
                                    });
                                    await sleep(5000); // 5 sec
                                    page++;
                                }
                            } catch(apiLookupError) {
                                if(apiLookupError.response && apiLookupError.response.status) {
                                    switch(apiLookupError.response.status) {
                                        case 404:
                                            console.log('[-] Leaderboard lookup failed: 404');
                                            break;
                                        case 429:
                                            console.log('[-] Leaderboard lookup failed: 429');
                                            break;
                                        default:
                                            console.log('[x] Leaderboard lookup failed: Unknown error');
                                            break;
                                    }

                                }
                            }
                        }
                    }
                }
            } catch(dbLookupError) {
                console.error(dbLookupError);
            }
        },
        updateSeasons: async () => {
            // get existing seasons firsts
            for(const plat of platforms) {
                try {
                    console.log(`[-] Searching for platform: ${plat}`);
                    const seasons = await new Promise((resolve, reject) => {
                        pool.query(queries.seasons(plat), (err, seas) => {
                            if(err) {
                                reject(err);
                            }
                            else {
                                resolve(seas);
                            }
                        });
                    });
                    // get seasons from api
                    const resSasonsApi = await pubgApi.getSeasons(plat);
                    const seasonsApi = resSasonsApi.data.data;
                    if(seasonsApi && seasonsApi.length) {
                        if(seasonsApi.length > seasons.length) {
                            const uniqs = [];
                            for(const sa of seasonsApi) {
                                const findIndex = seasons.findIndex(s => s.season_id === sa.id);
                                if(findIndex === -1) {
                                    uniqs.push(sa);
                                } 
                            }
                            // now insert the unique ones
                            await new Promise((resolve, reject) => {
                                pool.query(queries.insertSeasons(uniqs, plat), (err, done) => {
                                    if(err) {
                                        reject(err);
                                    }
                                    else {
                                        resolve();
                                    }
                                })
                            });
                        }
                    }
                } catch(seasLookupErr) {
                    console.error(seasLookupErr);
                }
            }
        },
    };
};