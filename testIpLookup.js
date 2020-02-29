const axios = require('axios');
const configs = require('./configs.json');
const ipLookup = require('./ip-lookup')(axios, configs);

(async () => {
    const res = await ipLookup('8.8.8.8');
    console.log('Looked up 8.8.8.8');
    console.log(res.data);
})();