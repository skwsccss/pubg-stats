/*
    * A simple in-memory cache wrapper on top of
    * memcached. The default port is 11211, host 127.0.0.1
    * 
*/
module.exports = function(configs, memcached) {
    // config is the configs.json file
    const { MEMCACHED_HOST, MEMCACHED_PORT } = configs;
    const MAX_EXPIRATION = 3600; // 1 hour

    return class InMemoryCache {
        constructor() {
            this.cache = new memcached(`${MEMCACHED_HOST}:${MEMCACHED_PORT}`, {
                maxExpiration: MAX_EXPIRATION,
                poolSize: 2,
            });
        }
        _get(key, cb) {
            if(!key || !cb) {
                throw new Error('Key and/or callback for cache._get cannot be undefined');
            }
            this.cache.get(key, cb);
        }
        _set(key, value, cb, life = MAX_EXPIRATION) {
            if(!key || !value || !cb) {
                throw new Error('Key, value and/or callback undefiend');
            }
            this.cache.set(key, value, life, cb);
        }
        // actual cache functions
        async getPlayerMatches(playerName) {
            const matches = await new Promise((resolve, reject) => {
                this._get(playerName, (err, mats) => {
                    if(err) reject(err);
                    else resolve(mats);
                });
            })
            .catch(e => {
                console.error(e);
                return false;
            });
            return matches;
        }
        async setPlayerMatches(playerName, matches, life) {
            await new Promise((resolve, reject) => {
                this._set(playerName, matches, (err) => {
                    if(err) reject(err);
                    else resolve();
                }, life);
            })
            .catch(e => console.error(e));
        } 
    };
};