// for handling the queries
const { QueryNotDefined, CallbackNotDefined } = require('../errors');

module.exports = function(conn) {

    return {
        insertSeasonsHandler: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('insertSeasonsHandler');
            }
            if(!query) {
                return cb(new QueryNotDefined('insertSeasonsHandler'), null);
            }
            return conn.query(query, cb);
        },
        insertMatchesHandler: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('insertMatchesHandler');
            }
            if(!query) {
                return cb(new QueryNotDefined('insertMatchesHandler'), null);
            }
            return conn.query(query, cb);
        },
        insertTournamentsHandler: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('insertTournamentsHandler');
            }
            if(!query) {
                return cb(new QueryNotDefined('insertTournamentsHandler'), null);
            }
            return conn.query(query, cb);
        },
        insertGameSchemaHandler: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('insertGameSchemaHandler');
            }
            if(!query) {
                return cb(new QueryNotDefined('insertGameSchemaHandler'), null);
            }
            return conn.query(query, cb);
        },
        insertGlobalAchivementsPercentages: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('insertGlobalAchievementsPercentagesHandler');
            }
            if(!query) {
                return cb(new QueryNotDefined('insertGlobalAchievementsPercentagesHandler'), null);
            }
            return conn.query(query, cb);
        },
        insertSeasonsLeaderboard: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('insertSeasonsLeaderboard');
            }
            if(!query) {
                return cb(new QueryNotDefined('insertSeasonsLeaderboard'), null);
            }
            return conn.query(query, cb);
        },
        haveMatchesCached: (query, cb) => { 
            if(!cb) {
                throw new CallbackNotDefined('haveMatchesCached');
            }
            if(!query) {
                return cb(new QueryNotDefined('haveMatchesCached'), null);
            }
            return conn.query(query, cb);
        },
        haveSeasonsCached: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('haveSeasonsCached');
            }
            if(!query) {
                return cb(new QueryNotDefined('haveSeasonsCached'), null);
            }
            conn.query(query, cb);
        },
        haveTournamentsCached: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('haveTournamentsCached');
            }
            if(!query) {
                return cb(new QueryNotDefined('haveTournamentsCached'), null);
            }
            conn.query(query, cb);
        },
        haveGameSchema: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('haveGameSchema');
            }
            if(!query) {
                return cb(new QueryNotDefined('haveGameSchema'), null);
            }
            conn.query(query, cb);
        },
        haveGlobalAchievementsPercentages: (query, cb) => {
            if(!cb) {
                throw new CallbackNotDefined('haveGlobalAchievementsPercentages');
            }
            if(!query) {
                return cb(new QueryNotDefined('haveGlobalAchievementsPercentages'), null);
            }
            conn.query(query, cb);
        }

    };
};