/*
    * REST API for pubgstats.info
    * ---------------------------
    * Author: Abrar H Galib
    * Description: This is the entry file for the backend server.
    *   It deals with all external APIs and provides CRUD for MySQL database
*/

/////// ESSENTIAL PKGS   \\\\\\\\\\\\\\\\
const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const connectMemcached = require('connect-memcached')(session);
const cors = require('cors');
const axios = require('axios');
const mysql = require('mysql');
const memcached = require('memcached');
const squel = require('squel').useFlavour('mysql');
const moment = require('moment');
const winston = require('winston');
// monkey patch winston
require('winston-daily-rotate-file');

/////// CONFIG FILES    \\\\\\\\\\\\\\\\\\\\\
const configs = require('./configs.json');
const pubgStatsJson = require('./pubg-stats.json');
const mapNames = require('./mapName.json');
const mapStats = require('./stats.json');

/////// LOGGER  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
const transport = new winston.transports.DailyRotateFile({
    filename: 'log-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '30'
});
const logger = winston.createLogger({
    transports: [ transport ]
});

////// API and Handlers  \\\\\\\\\\\\\\\\\\\\\\
const { endConnectionHandler, DBHandlers } = require('./db-functions/dbfunctions');
const pubgApi = require('./apis/pubg-api')(axios, configs.APIkey);
const steamApi = require('./apis/steam-api')(axios, configs.SteamAPIKey, configs.PUBGAppID);
const _pubgstatsApi = require('./apis/pubgstats-api');
const queries = require('./db-functions/queries')(squel);
const _queryFunctions = require('./db-functions/queryFunctions');
const _pubgApiHandlers = require('./pubg-api-handlers');
const { 
    generateMatchID, getAllPlayerMatches, sleep,
} = require('./utils');
const InMemCache = require('./db-functions/cache')(configs, memcached);
const IpLookup = require('./ip-lookup')(axios, configs);

////// CONSTANTS      \\\\\\\\\\\\\\\\\\\\\\\\\\
const ACCESS_CTRL_MAX_AGE = 3600 * 2; // 2 hours
const MYSQL_POOL_MAX_CONNECTIONS = 5; 
const COOKIE_MAX_AGE = 3600; //  1hr; for prod, make it 7 days
const BASEDIR = process.cwd();
// const BASEDIR = '/srv/www/pubg-stats/';
const VIEWSDIR = BASEDIR + '/views';
const ASSETSDIR = BASEDIR + '/assets';
const FAVSDIR = BASEDIR + '/favs';
const SCRIPTSDIR = BASEDIR + '/scripts';

////// SERVER SETUP    \\\\\\\\\\\\\\\\\\\\\\\\\\
const server = express();
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(cors({
    "origin": true,
    "methods": "GET,POST,OPTIONS",
    "preflightContinue": true,
    "optionsSuccessStatus": 200,
    "maxAge": ACCESS_CTRL_MAX_AGE,
    "allowedHeaders": ["Content-Type", "Content-Length", "Access-Control-Allow-Origin"]
}));
/*server.use(session({
    name: 'pubgstats.sid',
    secret: 'SOME-SECRETS-HERE',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: COOKIE_MAX_AGE,
        secure: false, // change in production
        sameSite: true,
        httpOnly: true,
        domain: '127.0.0.1'
    },
    store: new connectMemcached({
        hosts: ['127.0.0.1:11211'],
        secret: 'SOME-OTHER-SECRETS-HERE',
        ttl: 24 * 3600
    })
}));*/
server.use(cookieParser('SOME-SECRETS-HERE', {
    domain: '/',
    httpOnly: true,
    sameSite: true,
    maxAge: 3600 * 2
}));
// EJS setup for SSR
server.set('view engine', 'ejs');
server.set('views', VIEWSDIR);
server.use(express.static(ASSETSDIR));
server.use(express.static(FAVSDIR));
server.use(express.static(SCRIPTSDIR));

//// DATABASE CONNECTIONS  \\\\\\\\\\\\\\\\\\\\\\\\\\\
const DBPool = mysql.createPool({
    connectionLimit: MYSQL_POOL_MAX_CONNECTIONS,
    host: configs.DBHOST,
    user: configs.DBUSER,
    password: configs.DBPASS,
    database: configs.DBNAME
});
const CachePool = new InMemCache();

////////// API SETUPS       \\\\\\\\\\\\\\\\\\\\\\
const queryFns = _queryFunctions(DBPool);
const pubgApiHandlers = _pubgApiHandlers(queryFns, queries);
const pubgStatsApi = _pubgstatsApi(express, DBPool, queries, 
    queryFns, pubgApi, pubgApiHandlers, CachePool, logger);

// setup HTTPS


// for SSL verfication
server.get('/*', async (req, res, nxt) => {
    const url = req.originalUrl;
    if(url.indexOf('.well-known') !== -1) {
        const fname = url.split('/').pop();
        return res.send(
            fs.readFileSync(path.resolve('./.well-known/acme-challenge/'.concat(fname))));
    }
    nxt();
});

// insert SSR View Engine here
server.get('/', async (req, res, nxt) => {
    const ip = req.ip;
    console.log(`IP: ${ip}`);
    if(req.cookies && req.cookies.loc) {
        console.log('cookie already set');
        return res.render('index');
    }
    res.render('index');
});
server.get('/leaderboard', async(req, res, nxt) => {
    // lookup current leaderboard
    try {
        const resLeaders = await pubgApi.getSeasonLeaderboard(
            'division.bro.official.pc-2018-05', 'solo', 0, 'steam');
        const leaders = pubgApiHandlers.getSeasonLeaderboardHandler(resLeaders);
        //console.log(leaders);
        res.render('leaderboard', { leaderboard: leaders, modeActive: 'solo', platform: 'steam' });
    } catch(lkupErr) {
        if(lkupErr.response && lkupErr.response.status && lkupErr.response.status === 404) {
            res.render('404');
        } 
        else {
            res.render('500');
        }
    }
});

// setup the static directory root 
server.use('/leaderboard/:platform/:gameMode', express.static(ASSETSDIR));
server.use('/leaderboard/:platform/:gameMode', express.static(FAVSDIR));
server.use('/leaderboard/:platform/:gameMode', express.static(SCRIPTSDIR));
server.get('/leaderboard/:platform/:gameMode', async(req, res, nxt) => {
    let { platform, gameMode } = req.params;
    if(!platform) {
        platform = 'steam'; // steam by default 
    }
    if(!gameMode) {
        gameMode = 'solo';
    }
    try {
        // lookup recent season for platform
        const seas = await new Promise((resolve, reject) => {
            DBPool.query(queries.seasons(platform), (err, seas) => {
                if(err) {
                    reject(err);
                }
                else {
                    resolve(seas);
                }
            });
        });
        const current = seas[0];
        // get the ledaerboard
        const resLeaders = await pubgApi.getSeasonLeaderboard(current.season_id, gameMode, 0, platform);
        const leaders = pubgApiHandlers.getSeasonLeaderboardHandler(resLeaders);
        res.render('leaderboard', { leaderboard: leaders, modeActive: gameMode, platform: platform });
    } catch(lkupErr) {
        if(lkupErr.response && lkupErr.response.status && lkupErr.response.status === 404) {
            res.render('404');
        } 
        else {
            console.error(lkupErr);
            res.render('500');
        }
    }
    
});

server.use('/player', express.static(ASSETSDIR));
server.use('/player', express.static(FAVSDIR));
server.use('/player', express.static(SCRIPTSDIR));
server.get('/player', async (req, res, nxt) => {
    if(req.cookies && req.cookies.p) {
        return res.render('playerStats', { playerName: req.cookies.p.playerName });
    }
    res.render('playerStats', { playerName: '' });
});

server.use('/player/:playerName', express.static(ASSETSDIR));
server.use('/player/:playerName', express.static(FAVSDIR));
server.use('/player/:playerName', express.static(SCRIPTSDIR));
server.get('/player/:playerName', async (req, res, nxt) => {
    const { playerName } = req.params;
    if(!playerName) {
        return res.render('404');
    }
    console.log(req.cookies.loc);
    if(req.cookies && req.cookies.p) {
        console.log('[-] Cookie set already');
    }
    res.render('playerStats', { playerName: playerName });
});

/*
server.use('/player/:platform/:playerName', express.static(ASSETSDIR));
server.use('/player/:platform/:playerName', express.static(FAVSDIR));
server.use('/player/:platform/:playerName', express.static(SCRIPTSDIR));
server.get('/player/:platform/:playerName', async(req, res, nxt) => {
    // update the cache with player name; if not exists, throw 500
    const { platform, playerName } = req.params;
    if(!playerName) {
        return res.render('404');
    }
    if(!platform) {
        // try with steam
        platform = 'steam';
    }
    // check if ip is cached
    const ip = req.ip;
    const found = await new Promise((resolve, reject) => {
        CachePool._get(ip, (gerr, found) => {
            if(gerr) {
                console.error(gerr);
            }
            resolve(found);
        });
    });
    if(!found) {
        res.render('500');
    }
    else {
        const o = JSON.parse(found);
        o.playerName = playerName;
        o.platform = platform;
        await new Promise((resolve, reject) => {
            CachePool._set(ip, JSON.stringify(o), (serr) => {
                if(serr) {
                    console.error(serr);
                }
                resolve();
            });
        });
    }
    nxt();
});*/
server.get('/player/:platform/:playerName', async (req, res, nxt) => {
    // lookup player from api; if found, show stats; else 404
    const ip = req.ip;
    try {
        let { platform, playerName } = req.params;
        if(!platform) {
            platform = 'steam'; // default
        }
        if(!playerName) {
            console.log(`PlayerName not submitted? ${playerName}`);
            return res.render('404');
        }
        // add code to lookup db first
        let wasCached = false;
        const pn = await new Promise((resolve, reject) => {
            const q = `
            SELECT player_name, account_id from visitor WHERE player_name LIKE '${playerName}'  
            `;
            DBPool.query(q, (err, row) => {
                if(err) {
                    console.log('[-] No user matching that name in db');
                    resolve(playerName); // use the user provided one
                }
                else {
                    if(row && row.length > 0) {
                        resolve(row[0]);
                    }
                    else {
                        resolve(playerName);
                    }
                }
            });
        });
        if(pn) {
            wasCached = true;
        }
        if(pn.player_name) {
            playerName = pn.player_name;
        }
        let resPlayer, playerId;
        if(pn.account_id) {
            playerId = pn.account_id;
        }
        else {
            try {
                resPlayer = await pubgApi.getPlayer(playerName, platform);
                playerId = pubgApiHandlers.getPlayerHandler(resPlayer);
            } catch(idLkUpErr) {
                // nothing else to ;(
                    return res.render('404');   
            }
        }
        
        console.log(`PlayerName: ${playerName}  ID: ${playerId}  Platform: ${platform}`);
        const recentSeasons = await new Promise((resolve, reject) => {
            DBPool.query(queries.seasons(platform), (gerr, seas) => {
                if(gerr) {
                    console.error(gerr);
                }
                resolve(seas);
            });
        });
        if(!recentSeasons) {
            return res.render('500');
        }
        let sts = [];
        for(const s of recentSeasons) {
            try {
                let resstats = await pubgApi.getPlayerSeasonStats(playerId, s.season_id, platform);
                let stats = pubgApiHandlers.getPlayerSeasonLifetimeStatsHandler(resstats);
                sts.push(stats);
            } catch(plLookUpError) {
                console.log('Throwing here');
                console.error(plLookUpError);
                return res.render('404');                
            }
        }
        const vq = `
            INSERT INTO visitor(player_name, account_id)
            VALUES ('${playerName}', '${playerId}');
        `;
        if(!wasCached) {
            DBPool.query(vq, (err, inserted) => {
                if(err) {
                    console.log('[x] Error while inserting visitor');
                    console.error(err);
                }
                else {
                    console.log('[*] Visitor with ' + ip + ' inserted');
                }
            });    
        }
        res.render('playerStatsDetails', { stats: sts, activePlatform: platform, playerName: playerName });
        
    } catch(lookupErr) {
        console.log('Throwing at the end');
        console.error(lookupErr);
        return res.render('404');
    }
});

server.use('/weaponsMastery', express.static(ASSETSDIR));
server.use('/weaponsMastery', express.static(FAVSDIR));
server.use('/weaponsMastery', express.static(SCRIPTSDIR));
server.get('/weaponsMastery', async (req, res, nxt) => {
    let pname = "";
    if(req.cookies && req.cookies.p) {
        pname = req.cookies.p.playerName;
    }
    res.render('weapons-stats', { activePlatform: 'steam', playerName: pname, stats: null });
});

server.use('/weaponsMastery/:platform/:playerName', express.static(ASSETSDIR));
server.use('/weaponsMastery/:platform/:playerName', express.static(FAVSDIR));
server.use('/weaponsMastery/:platform/:playerName', express.static(SCRIPTSDIR));
server.get('/weaponsMastery/:platform/:playerName', async (req, res, nxt) => {
    const { platform, playerName } = req.params;
    let pname;
    if(!platform) {
        return res.render('404');
    }
    if(req.cookies && req.cookies.p) {
        console.log(`[-] Cookie Player Name: ${req.cookies.p.playerName}`);
        pname = req.cookies.p.playerName;
    }
    if(!playerName && !pname) {
        return res.render('500');
    }
    // lookup weapons stats
    try {
        let pid;
        if(!req.cookies && !req.cookies.p && req.cookies.p.playerId) {
            // lookup
            try {
                const resPlayer = await pubgApi.getPlayer(playerName, platform);
                pid = pubgApiHandlers.getPlayerHandler(resPlayer);
            } catch(idLkUpErr) {
                console.error(idLkUpErr);
                return res.render('404');
            }
        }
        else {
            pid = req.cookies.p.playerId;
        }
        const resStats = await pubgApi.getWeaponsMastery(pid, platform);
        const stats = pubgApiHandlers.getWeaponsMasteryHandler(resStats);
        res.render('weapons-stats', { activePlatform: 'steam', playerName: pname, stats: stats });
    } catch(lkupErr) {
        console.error(lkupErr);
        res.render('500');
    }
});

server.use('/telemetry', express.static(ASSETSDIR));
server.use('/telemetry', express.static(FAVSDIR));
server.use('/telemetry', express.static(SCRIPTSDIR));
server.get('/telemetry', async (req, res, nxt) => {
    
    res.render('telemetry');
});

server.get('/getTelemetries', async (req, res, nxt) => {
    try {
        const telem = await new Promise((resolve, reject) => {
            const q = `
                SELECT * FROM regional_modes_stats;
            `;
            DBPool.query(q, (err, stats) => {
                if(err) {
                    reject(err);
                }
                else {
                    resolve(stats);
                }
            });
        });
        const matchCount = await new Promise((res, rej) => {
            const q = `
                SELECT COUNT(match_id) AS 'matCount' FROM matches
            `;
            DBPool.query(q, (err, c) => {
                if(err) {
                    console.log('[x] Could not get count');
                    console.error(err);
                    rej(err);
                }
                else {
                    res(c[0].matCount);
                }
            });
        });
        const resActivePlayersSteam = await steamApi.getPlayersCount();
        const activePlayersSteam = resActivePlayersSteam.data.response.player_count;
        console.log(activePlayersSteam);
        res.json({
            status: 200,
            stats: telem,
            activePlayersSteam: activePlayersSteam,
            mapNames: mapNames,
            activePlayers: (() => {
                let counts = {
                    solo: 0, duo: 0, squad: 0, solo_fpp: 0, duo_fpp: 0, squad_fpp: 0
                };
                for(const row of telem) {
                    Object.keys(counts)
                        .forEach(mode => counts[mode] = counts[mode] + row[mode]);
                }
                let t = 0;
                const modes = Object.keys(counts);
                for(const m of modes) {
                    if(m.startsWith('solo')) t += counts[m];
                    else if(m.startsWith('duo')) t += counts[m] * 2;
                    else if(m.startsWith('squad')) t += counts[m] * 4;
                }
                return t;
            })(),
            matchesCount: matchCount,
            mapStats: JSON.parse(fs.readFileSync('./stats.json', { encoding: 'utf8'})),
            pollingSince: '2020-02-01'
        });
    } catch(err) {
        console.error(err);  
        res.render('500');
    }
});

//server.use('/api', pubgStatsApi);

// check for env vars
if(process.env.PUBGSTATS_HOST && process.env.PUBGSTATS_PORT) {
    // for production depoloyment
    if(process.env.PUBGSTATS_HOST !== 'localhost') {
        process.env.PUBGSTATS_HOST = 'localhost';
    }
    if(process.env.PUBGSTATS_PORT !== '4200') {
        process.env.PUBGSTATS_PORT = 4200;
    }
    configs.SERVER_HOST = process.env.PUBGSTATS_HOST;
    configs.SERVER_PORT = process.env.PUBGSTATS_PORT;
}
server.listen(configs.SERVER_PORT, configs.SERVER_HOST, () => {
    logger.info(`[${moment().format('YYYY MM DD h:mm')}] PUBGStats.info server started at ${configs.SERVER_HOST}:${configs.SERVER_PORT}`);
    console.log(`[${moment().format('YYYY MM DD h:mm')}] PUBGStats.info server started at ${configs.SERVER_HOST}:${configs.SERVER_PORT}`)
});
