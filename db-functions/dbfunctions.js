module.exports = {
    endConnectionHandler: (error) => {
        if(error) {
            console.log('[!] Fatal error while closing database connection');
            console.error(error);
            process.exit(1);
        }
    },
    DBHandlers: function(DBConnection, qfns, queries, pubgApiHandlers) {
        // the db handlers object
        return {
            samplesHandler: async () => {
                qfns.haveMatchesCached(queries.matches(), (err, cache) => {
                    if(err) {
                        console.log('[!] Error while accessing cached matches');
                        return DBConnection.end(endConnectionHandler);
                    }
                    if(cache && cache.length) {
                        // cached results exists
                        console.log('[*] Matches are cached');
                        //console.log(cache);
                        return ;
                    }
                    // fetch the samples
                    api.getSamples()
                        .then(res => pubgApiHandlers.getSamplesHandler(res))
                        .catch(matchesFetchError => {
                            console.log('[!] Error occured while fetching matches');
                            console.error(matchesFetchError);
                            DBConnection.end(endConnectionHandler);
                        });
                });
            },
            tournamentsHandler: async () => {
                qfns.haveTournamentsCached(queries.tournaments(), (err, cache) => {
                    if(err) {
                        console.log('[!] Error while accessing cached tournaments');
                        return DBConnection.end(endConnectionHandler);
                    }
                    if(cache && cache.length) {
                        console.log('[*] Tournaments are already cached');
                        return ;
                    }
                    // fetch tournaments
                    api.getTournaments()
                        .then(res => pubgApiHandlers.getTournaments(res))
                        .catch(toursFetchErr => {
                            console.log('[!] Error while fetching tournaments');
                            console.error(toursFetchErr);
                        });
                });
            },
            gameSchemaHandler: async () => {
                qfns.haveGameSchema(queries.gameSchema(), (cacheErr, cache) => {
                    if(cacheErr) {
                        console.log('[!] Error while fetching game schema cache.');
                        console.error(cacheErr);
                        DBConnection.end(endConnectionHandler);
                    }
                    if(cache && cache.length && cache.length > 0) {
                        // exists!
                        console.log('[*] Game Schema already cached.');
                    }
                    else {
                        steamApi.getGameSchema()
                            .then(res => pubgApiHandlers.getGameSchemaHanlder(res))
                            .catch(fetchSchemaErr => {
                                console.log('[!] Error while fetching schema');
                                console.error(fetchSchemaErr);
                                DBConnection.end(endConnectionHandler);
                            })
                    }
                });
            },
            globalAchievementsPercentagesHandler: async () => {
                qfns.haveGlobalAchievementsPercentages(queries.percentages(), (cacheErr, cache) => {
                    if(cacheErr) {
                        console.log('[!] Error while fetching cached percentages');
                        console.error(cacheErr);
                        DBConnection.end(endConnectionHandler);
                    }
                    if(cache && cache.length && cache.length > 0) {
                        console.log('[*] Global Achievements Percentages cached');
                    }
                    else {
                        steamApi.getGlobalAchievementsPercentages()
                            .then(res => pubgApiHandlers.getGlobalAchievementsPercentagesHandler(res))
                            .catch(fetchPercErr => {
                                console.log('[!] Error while fetching percentages');
                                console.error(fetchPercErr);
                                DBConnection.end(endConnectionHandler);
                            });
                    }
                });
            }
        };
    }
}