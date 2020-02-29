// The full API object
module.exports = function(axios, apikey) {
    // configure an instance of axios
    const baseURL = "https://api.pubg.com/";
    const headers = {
        "Authorization": `Bearer ${apikey}`,
        "Accept": "application/vnd.api+json"
    };
    const axiosInstance = axios.create({ baseURL, headers });

    // the API object
    return {
        getSeasons: (shard = 'steam') => {
            // returns a list of all seasons
            return axiosInstance.get(`shards/${shard}/seasons`);
        },
        getSamples: (shard = 'steam') => {
            // returns a list of sample matches from a region
            return axiosInstance.get(`shards/${shard}/samples`);
        },
        getTournaments: () => {
            return axiosInstance.get('tournaments');
        },
        getPlayer: (playerId, shard = 'steam') => {
            return axiosInstance.get(`shards/${shard}/players?filter[playerNames]=${playerId}`);
        },
        getMatch: (matchId, shard = 'steam') => {
            return axiosInstance.get(`shards/${shard}/matches/${matchId}`);
        },
        getPlayerSeasonStats: (accountId, seasonId, shard = 'steam') => {
            // accountId is the actual id of the player
            // seasonId are from db
            return axiosInstance.get(`shards/${shard}/players/${accountId}/seasons/${seasonId}`);
        },
        getSeasonLeaderboard: (seasonId, gameMode, page = 0, shard = 'steam') => {
            // page = 0 : top 500
            // page = 1 : next 500
            return axiosInstance.get(`shards/${shard}/leaderboards/${seasonId}/${gameMode}?page[number]=${page}`);
        },
        getWeaponsMastery: (playerId, shard = 'steam') => {
            return axiosInstance.get(`shards/${shard}/players/${playerId}/weapon_mastery`);
        }
    };
};