/*  Sample Data
    { 
        ip_address: '8.8.8.8',
        country: 'United States',
        country_code: 'US',
        continent: 'North America',
        continent_code: 'NA',
        city: null,
        county: null,
        region: null,
        region_code: null,
        timezone: 'America/Chicago',
        owner: null,
        longitude: -97.822,
        latitude: 37.751,
        currency: 'USD',
        languages: [ 'en-US', 'es-US', 'haw', 'fr' ] 
    }

*/
module.exports = function(axios, configs) {
    const baseURL = 'https://api.ipfind.com';
    return function(ip) {
        return axios.request({
            baseURL: baseURL,
            method: 'get',
            params: {
                auth: configs.IPFIND_API_KEY,
                ip: ip
            }
        });
    }
};