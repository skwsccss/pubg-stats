module.exports = function(qfns, queries) {
    // qfns: query functions

    return {
        getSamplesHandler: (res) => {
            const matches = res.data.data.relationships.matches.data;
                qfns.insertMatchesHandler(queries.insertMatches(matches), (err) => {
                    if(err) {
                        console.log('[!] Error while inserting matches');
                        console.error(err);
                    }
                    else {
                        console.log('[*] Matches added successfully');   
                    }                    
                });
        },
        getTournamentsHanlder: (res) => {
            const tours = res.data.data;
                qfns.insertTournamentsHandler(queries.insertTournaments(tours), (inserr) => {
                    if(inserr) {
                        console.log('[!] Error while inserting tournaments');
                        console.error(inserr);
                    }
                    else {
                        console.log('[*] Tournaments inserted successfully');
                    }
                });
        },
        getGameSchemaHandler: (res) => {
            const schema = res.data.game.availableGameStats.achievements;
                qfns.insertGameSchemaHandler(queries.insertGameSchema(schema), (inserr) => {
                    if(inserr) {
                        console.log('[!] Error while inserting game schema');
                        console.error(inserr);
                        return ;
                    }
                    console.log('[*] Schema inserted successfully');
                });
        },
        getGlobalAchievementsPercentages: (res) => {
            const percentages = res.data.achievementpercentages.achievements;
                qfns.insertGlobalAchivementsPercentages(
                    queries.insertGamePercentages(percentages),
                    (err) => {
                        if(err) {
                            console.log('[!] Error while inserting percentages');
                            console.error(err);
                            return ;
                        }
                        console.log('[*] Global Achievements Percentages inserted successfully');
                    }
                );
        },
        getPlayerAllMatchesHandler: (res) => {
            const data = res.data.data;
            const matches = data[0].relationships.matches.data;
            const matchIDGen = generateMatchID(matches);

            //console.log('[*] Fetched all match ids for WackyJacky101');
            //console.log('[*] Fetching match details');
            const interval = setInterval(getAllPlayerMatches, 10000, matchIDGen, api, mapNames);
        },
        getPlayerHandler: (res) => {
            // data is an array
            const data = res.data.data;
            return data[0].id;
        },
        getMatchHandler: (res, pid) => {
            const data = res.data.data;
            //console.log(res.data.included);
            //console.log(res.data.included[0].attributes.stats);
            
            // find players stat
            if(!data.included) {
                return {
                    message: 'No stats found'
                };
            }
            const playerStat = res.data.included.find(o => o.attributes.stats.playerId === pid);
            return playerStat;
        },
        getPlayerSeasonLifetimeStatsHandler: (res) => {
            const data = res.data.data;
            const gameModeStats = data.attributes.gameModeStats;
            const matches = {
                squad: data.relationships.matchesSquad,
                squadFpp: data.relationships.matchesSquadFPP,
                solo: data.relationships.matchesSolo,
                soloFpp: data.relationships.matchesSoloFPP,
                duo: data.relationships.matchesDuo,
                duoFpp: data.relationships.matchesDuoFPP
            };
            //const name = data.attributes.name;
            return { gameModeStats, matches };
        },
        getSeasonLeaderboardHandler: (res) => {
            // show the names of top 500 in order of increasing rank
            const leaders = res.data.included;
            let ranked = leaders.sort((l1, l2) => l1.attributes.rank - l2.attributes.rank);
            ranked.map(player => {
                let attr = player.attributes;
                return {
                    playerName: attr.name,
                    rank: attr.rank,
                    rankPoints: attr.stats.rankPoints,
                    wins: attr.stats.wins,
                    gamesPlayed: attr.stats.games,
                    winRatio: attr.stats.winRatio,
                    averageDamage: attr.stats.averageDamage,
                    kills: attr.stats.kills,
                    killDeathRatio: attr.stats.killDeathRatio,
                    averageRank: attr.stats.averageRank
                };
            });
            //console.log(`Leaderboard for ${}`)
            //console.log(ranked);
            return ranked;
        },
        getWeaponsMasteryHandler: (res) => {
            const data = res.data.data;
            if(!data) {
                return false;
            }
            const attributes = data.attributes;
            if(!attributes) {
                return false;
            }
            if(!attributes.weaponSummaries) {
                return false;
            }
            return attributes.weaponSummaries;
        }
    };
}