/*
    * Using the random samples returned from the PUBG
    * API endpoints for all regions, across all platforms
    * update the regional_modes_stats table. Meant for 
    * cron for scheduled updates
*/
const mysql = require('mysql');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const fsp = fs.promises;


const configs = require('./configs.json');
const { sleep } = require('./utils');

const conn = mysql.createConnection({
    host: configs.DBHOST,
    user: configs.DBUSER,
    password: configs.DBPASS,
    database: configs.DBNAME
});
const adapter = new FileSync('./stats.json');
const jsondb = low(adapter);

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

const updater = async () => {
    const cached = await new Promise((rs, rj) => {
        conn.query(`SELECT match_id from matches`, (e, mts) => {
            if(e) {
                console.log('[x] Could not fetch cached matches');
                console.error(e);
                rs();
            }
            else {
                mts = mts.map(mo => mo.match_id);
                console.log('[-] Cached: ');
                console.log(mts);
                rs(mts);
            }
        })
    });
    const stats = {};
    const ids = [];
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
        const counts = {
            solo: 0, 'solo-fpp': 0, duo: 0, 'duo-fpp': 0, squad: 0, 'squad-fpp': 0, total: 0
        };
        let reg = plr.name;
        try {
            console.log(`[-] Getting samples for ${plr.region}`);
            const resSamples = await axiosInstance.get(`shards/${plr.region}/samples`);
            const samples = resSamples.data.data.relationships.matches.data;
            let count = 0;
            if(samples && samples.length) {
                console.log(`[-] Found ${samples.length} sample matches`);
                for(const samp of samples) {
                    if(count >= configs.SAMPLING_RATE) break;
                    const mid = samp.id;
                    if(cached.indexOf(mid) !== -1) {
                        console.log(`Match: ${mid} is already cached`);
                        continue;
                    }
                    try {
                        const resMatch = await axiosInstance.get(`shards/${shard}/matches/${mid}`);
                        const match = resMatch.data;
                        const matAttrs = match.data.attributes;
                        console.log(`[-] Got match with ID: ${mid}  Mode: ${matAttrs.gameMode}  Map: ${matAttrs.mapName}`);
                        ids.push(mid);
                        counts[matAttrs.gameMode]++;
                        counts.total++;
                        if(stats[reg]) {
                            if(stats[reg][matAttrs.mapName]) {
                                if(stats[reg][matAttrs.mapName][matAttrs.gameMode]) {
                                    stats[reg][matAttrs.mapName][matAttrs.gameMode]++;
                                }
                                else {
                                    if(modes.indexOf(matAttrs.gameMode) !== -1) {
                                        stats[reg][matAttrs.mapName][matAttrs.gameMode] = 1;
                                    }
                                }
                            }
                            else {
                                stats[reg][matAttrs.mapName] = {
                                    solo: 0, duo: 0, squad: 0, 'solo-fpp': 0, 'duo-fpp': 0, 'squad-fpp': 0
                                };
                                if(modes.indexOf(matAttrs.gameMode) !== -1) {
                                    stats[reg][matAttrs.mapName][matAttrs.gameMode]++;
                                }
                            }
                        }
                        else {
                            stats[reg] = {};
                            stats[reg][matAttrs.mapName] = {
                                solo: 0, duo: 0, squad: 0, 'solo-fpp': 0, 'duo-fpp': 0, 'squad-fpp': 0
                            };
                            if(modes.indexOf(matAttrs.gameMode) !== -1) {
                                stats[reg][matAttrs.mapName][matAttrs.gameMode]++;
                            }
                        }
                        count++;
                    } catch(sampErr) {
                        let status = 'Unknown';
                        if(sampErr && sampErr.response && sampErr.response.status) {
                            status = sampErr.response.status;
                        }
                        console.log(`[x] Error while looking up sample match: ${status}`);
                        console.error(sampErr);
                    }
                    await sleep(configs.TELEMETRY_API_REQ_DELAY);
                }
                // update DB
                console.log(`Total count for region ${plr.region}: ${JSON.stringify(counts)}`);
                const q = `UPDATE regional_modes_stats SET solo= solo + ${counts.solo}, 
                    solo_fpp= solo_fpp + ${counts['solo-fpp']}, duo= duo + ${counts.duo}, duo_fpp= duo_fpp + ${counts['duo-fpp']},
                    squad=squad + ${counts.squad}, squad_fpp=squad_fpp + ${counts['squad-fpp']}, total= total + ${counts.total} 
                    WHERE platform='${plat}' AND name='${plr.name}';
                `;
                await new Promise((resolve, reject) => {
                    conn.query(q, (uerr, up) => {
                        if(uerr) {
                            console.error(uerr);
                            conn.end(e => process.exit(1));
                        }
                        else {
                            resolve(up);
                        }
                    });
                });
                Object.keys(stats)
                    .forEach(r => {
                        Object.keys(stats[r])
                            .forEach(map => {
                                Object.keys(stats[r][map])
                                    .forEach(mode => {
                                        jsondb.update(`${r}.${map}.${mode}`, c => {
                                            c = c + stats[r][map][mode];
                                            return c;
                                        }).write();
                                    });
                            });
                    });
                //jsondb.write();
            }
            else {
                console.log(`[-] No samples for ${plr.region}`);
                await sleep(configs.TELEMETRY_API_REQ_DELAY);
            }
        } catch(sampleLookupError) {
            console.error(sampleLookupError);
        }
    }
    // write sample ids
    let mids = ids.map(i => `(NULL, '${i}')`).join(', ');
    const mq = `INSERT INTO matches VALUES ${mids}`;
    if(mids && mids.length && mids.length > 0) {
        await new Promise((res, rej) => {
            conn.query(mq, (err, inserted) => {
                if(err) {
                    console.log('[x] Could not update matches table');
                    console.error(err);
                    res();
                }
                else {
                    console.log('[*] Match ids updated');
                }
                res();
            });
        })
        .catch(e => console.error(e));
    }
};

if(!module.parent) {
    let up = true;
    setInterval(async () => {
        if(up) {
            up = false;
            await updater();
            up = true;
        }
    }, configs.TELEMETRY_UPDATE_INTERVAL);
}