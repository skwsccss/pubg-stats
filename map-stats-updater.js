const mysql = require('mysql');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const configs = require('./configs.json');
const { sleep } = require('./utils');

const conn = mysql.createConnection({
    host: configs.DBHOST,
    user: configs.DBUSER,
    password: configs.DBPASS,
    database: configs.DBNAME
});
const SAVEPATH = path.resolve('./telemetries');
const baseURL = "https://api.pubg.com/";
const headers = {
    "Authorization": `Bearer ${configs.APIkey}`,
    "Accept": "application/vnd.api+json",
    "Accept-Encoding": "gzip"
};
const axiosInstance = axios.create({ baseURL, headers });
const platforms = ['steam', 'console', 'kakao'];
const platformRegions = [
    { region: 'pc-as', name: 'Asia' },
    { region: 'pc-eu', name: 'Europe' },
    { region: 'pc-jp', name: 'Japan' },
    { region: 'pc-kakao', name: 'Kakao' },
    { region: 'pc-krjp', name: 'Korea' },
    { region: 'pc-na', name: 'North America' },
    { region: 'pc-oc', name: 'Oceania' },
    { region: 'pc-ru', name: 'Russia' },
    { region: 'pc-sa', name: 'South and Central America'},
    { region: 'pc-sea', name: 'South East Asia'},
    { region: 'psn-eu', name: 'Europe'},
    { region: 'psn-as', name: 'Asia'},
    { region: 'psn-na', name: 'North America'},
    { region: 'psn-oc', name: 'Oceania' },
    { region: 'xbox-as', name: 'Asia'},
    { region: 'xbox-eu', name: 'Europe'},
    { region: 'xbox-na', name: 'North America'},
    { region: 'xbox-oc', name: 'Oceania'},
    { region: 'xbox-sa', name: 'South and Central America'}
];
const modes = [
    'solo', 'duo', 'squad', 'solo-fpp', 'duo-fpp', 'squad-fpp'
];

(async () => {
    const stats = {};
    for(const plr of platformRegions) {
        let shard;
        if(plr.region.startsWith('pc')) {
            shard = 'steam';
        }
        else if(plr.region.startsWith('xbox')) {
            shard = 'xbox';
        }
        else if(plr.region.startsWith('psn')) {
            shard = 'xbox';
        }
        const plat = plr.region.split('-')[0];
        let reg = plr.name;
        try {
            console.log(`[-] Getting samples for ${plr.region}`);
            const resSamples = await axiosInstance.get(`shards/${plr.region}/samples`);
            const samples = resSamples.data.data.relationships.matches.data;
            let count = 0;
            if(samples && samples.length) {
                console.log(`[-] Found ${samples.length} sample matches`);
                for(const samp of samples) {
                    if(count > 50) break;
                    const mid = samp.id;
                    try {
                        const resMatch = await axiosInstance.get(`shards/${shard}/matches/${mid}`);
                        const match = resMatch.data;
                        const matAttrs = match.data.attributes;
                        console.log(`[-] Got match with ID: ${mid}  Mode: ${matAttrs.gameMode}  Map: ${matAttrs.mapName}`);
                        
                        count++;
                    } catch(sampErr) {
                        let status = 'Unknown';
                        if(sampErr && sampErr.response && sampErr.response.status) {
                            status = sampErr.response.status;
                        }
                        console.log(`[x] Error while looking up sample match: ${status}`);
                        //console.error(sampErr);
                    }
                    await sleep(6900);
                }
                // update DB
                console.log(stats);
            }
            else {
                console.log(`[-] No samples for ${plr.region}`);
                await sleep(6500);
            }
        } catch(sampleLookupError) {
            console.error(sampleLookupError);
        }
    }
    // write to file
    console.log('Full Stats');
    console.log(stats);
    fs.writeFileSync('./stats.json', JSON.stringify(stats), { encoding: 'utf8', flag: 'w+'});
})();