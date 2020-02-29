// A wrapper around steam API

module.exports = function(axios, apikey, appID) {
    const baseURL = "https://api.steampowered.com/";
    const axiosInstance = axios.create({ baseURL });

    return {
        getGameSchema: () => {
            // fetches a copy of all the achievments in PUBG
            return axiosInstance.get('ISteamUserStats/GetSchemaForGame/v2', {
                params: {
                    key: apikey,
                    appid: appID
                }
            });
        },
        getPlayersCount: () => {
            return axiosInstance.get('ISteamUserStats/GetNumberOfCurrentPlayers/v1', {
                params: {
                    appid: appID
                }
            });
        },
        getGlobalAchievementsPercentages: () => {
            return axiosInstance.get('ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2', {
                params: {
                    gameid: appID
                }
            });
        }
    };
};