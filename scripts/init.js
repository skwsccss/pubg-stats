const BASEURL = 'https://pubgstats.info/';
const MAPPINGS = {
    'Asia': 'as',
    'Europe': 'eu',
    'North America': 'na',
    'Japan': 'jp',
    'Oceania': 'oc',
    'Russia': 'ru',
    'South and Central America': 'sa',
    'South East Asia': 'sea',
    'Korea': 'krjp',
    'Kakao': 'kakao'
};
let TELEMETRY_STATS = null;

// Disable automatic style injection for CSP 
Chart.platform.disableCSSInjection = true;

const isMobile = () => {
    return window.innerWidth < 540;
};
const showPreloader = () => {
    const l = document.querySelector('#preloader');
    const c = document.querySelector('#tele-container');
    c.classList.add('dont-show');
    l.classList.add('active');
};
const showTelemetryContainer = (show = true) => {
    const c = document.querySelector('#tele-container');
    if(show) {
        c.classList.contains('dont-show') && c.classList.remove('dont-show');
    }
    else {
        !c.classList.contains('dont-show') && c.classList.add('dont-show');
    }
};
const changeMenu = (li) => {
    const ul = document.querySelector('#mobile-nav');
    const lis = ul.querySelectorAll('li');
    if(lis && lis.length) {
        for(const l of lis) {
            if(l.classList.contains('active')) {
                l.classList.remove('active');
            }
        }
    }
    li.classList.add('active');
};
const getLeaderboard = (evt) => {
    let modeOrPlatform = evt.getAttribute('value');
    let alreadySelected = evt.classList.contains('selected');
    if(alreadySelected) {
        return ;
    }
    switch(modeOrPlatform) {
        case 'steam': case 'psn': case 'xbox': case 'kakao':
            let modes = document.querySelector('#leaderboard-mode-sel');
            modes = modes.querySelectorAll('li').values();
            let mode;
            for(const m of modes) {
                if(m.classList.contains('selected')) {
                    mode = m.getAttribute('value');
                }
            }
                
            window.location.href = BASEURL.concat(['leaderboard' + `/${modeOrPlatform}` + `/${mode}`]);
            break;
        default:
            let plts = document.querySelector('#leaderboard-platform-sel');
            plts = plts.querySelectorAll('li').values();
            let plat;
            for(const p of plts) {
                if(p.classList.contains('selected')) {
                    plat = p.getAttribute('value');
                }
            }
            let amodes = document.querySelector('#leaderboard-mode-sel');
            amodes = amodes.querySelectorAll('li').values();
            let themode;
            for(const m of amodes) {
                if(m.classList.contains('selected')) {
                    themode = m.getAttribute('value');
                }
            }
            if(!plat) {
                return ;
            }
            window.location.href = BASEURL.concat(['leaderboard' + `/${plat}` + `/${modeOrPlatform}`]);
            break;
    }
};
const searchPlayer = (event) => {
    event.preventDefault();
    const searchField = $('#search-field');
    const name = $(searchField).val();
    const URL = BASEURL.concat(['player/' + `${name}`]);
    //window.location.href = URL;
    window.location.href = URL;
    return false;
};
const selectPlatformPlayerStats = (li) => {
    const ul = document.querySelector('#player-info-platform-sel');
    const lis = ul.querySelectorAll('li');
    for(const l of lis) {
        if(l && l.classList && l.classList.contains('selected')) {
            l.classList.remove('selected');
        }
    }
    li && li.classList && li.classList.add('selected');
};
const getPlayerStats = () => {
    const formInput = document.querySelector('#player-info-name-input');
    let name = formInput.value; // problem; since ejs sets it to '', must submit and try 
    if(!name) {
        // submit form 
        const form = document.querySelector('#player-stats-name-form');
        form.onsubmit = () => { return false; }
        form.submit();
        const fi = form.querySelector('#player-info-name-input');
        return ;
    }   
    const ul = document.querySelector('#player-info-platform-sel');
    const lis = ul.querySelectorAll('li');
    let li;
    for(li of lis) {
        if(li.classList.contains('selected')) break;
    }
    const platform = li.getAttribute('value');
    window.location.href = BASEURL.concat(['player/' + `${platform}` + `/${name}`]);
};
const parseModeData = (mode, arr) => {
    let a = [];
    arr.forEach(e => a.push((e[mode]/e.total) * 100));
    return a.map(p => parseFloat(p).toFixed(2));
}
const showRegionalModeStats = () => {
    if(!TELEMETRY_STATS) {
        return console.log('[x] No telemetry data cached');
    }
    const mdist = document.querySelector('#mdist-region');
    const pc = TELEMETRY_STATS.filter(s => s.platform === 'pc');
    const sorted = pc.sort((a, b) => {
        if(a.name > b.name) return 1;
        else if(a.name < b.name) return -1;
        else return 0;
    });
    if(!isMobile()) {
        mdist.height = 50;
    }
    new Chart(mdist, {
        type: 'bar',
        data: {
            labels: Object.values(MAPPINGS).sort().map(l => {
                if(l === 'krjp') return 'Kor';
                else return l[0].toUpperCase() + l.substr(1);
            }),
            datasets: [{
                label: 'Solo',
                backgroundColor: "rgb(232, 211, 63)",
                data: parseModeData('solo', sorted),
            }, {
                label: 'Duo',
                backgroundColor: "rgb(209, 123, 15)",
                data: parseModeData('duo', sorted),
            }, {
                label: 'Squad',
                backgroundColor: "rgb(183, 173, 207)",
                data: parseModeData('squad', sorted),
            }, {
                label: 'Solo FPP',
                backgroundColor: 'rgb(241, 81, 82)',
                data: parseModeData('solo_fpp', sorted)
            }, {
                label: 'Duo FPP',
                backgroundColor: 'rgb(53, 59, 60)',
                data: parseModeData('duo_fpp', sorted)
            }, {
                label: 'Squad FPP',
                backgroundColor: 'rgb(64, 112, 118)',
                data: parseModeData('squad_fpp', sorted)
            }],
        },
        options: {
            tooltips: {
                displayColors: true,
            },
            scales: {
            xAxes: [{
                stacked: true,
                gridLines: {
                display: false,
                }
            }],
            yAxes: [{
                stacked: true,
                ticks: {
                    min: 0,
                    max: 100.00
                },
                type: 'linear',
            }]
            },
            responsive: true
        }
    });
};
const parseMapData = (mode, mnames, stats) => {
    let d = [];
    const regions = Object.keys(stats);
    for(const r of regions) {
        let total = 0;
        Object.keys(stats[r])
            .forEach(mapType => {
                if(mapType.startsWith('Range')) return ;
                Object.keys(stats[r][mapType])
                    .forEach(gamemode => total += stats[r][mapType][gamemode])
            });
        let modeTot = 0;
        for(const m of mnames) {
            if(stats[r][m] && stats[r][m][mode] >= 0) {
                // find the total
                modeTot += stats[r][m][mode];
            }
        }
        d.push((modeTot/total) * 100);
    }
    return d.map(p => parseFloat(p).toFixed(2));
};

const showRegionMapCharts = (mapNames, mapStats) => {
    const ctx = document.querySelector('#mdist-maps');
    const ctx2 = document.querySelector('#reg-maps');
    const snames = Object.keys(mapNames).sort();
    const colors = {
        'Baltic_Main': "rgb(232, 211, 63)",
        'Desert_Main': "rgb(209, 123, 15)",
        'DihorOtok_Main': "rgb(183, 173, 207)",
        'Savage_Main': "rgb(64, 112, 118)",
        'Summerland_Main': "rgb(116,179,206)",
        'Other': 'rgb(101, 101, 102)'
    };
    const anames = snames.map(n => mapNames[n]);
    if(!isMobile()) {
        ctx.height = 50;
        ctx2.height = 50;
    }
    anames.forEach((n, i, a) => {
        if(n.search(/\(Remastered\)/) !== -1) {
            a[i] = 'Erangel';
        }
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: anames,
            datasets: [
                {
                    label: 'Solo',
                    backgroundColor: "rgb(232, 211, 63)",
                    data: parseMapData('solo', snames, mapStats)
                },
                {
                    label: 'Duo',
                    backgroundColor: 'rgb(209, 123, 15)',
                    data: parseMapData('duo', snames, mapStats) 
                },
                {
                    label: 'Squad',
                    backgroundColor: 'rgb(183, 173, 207)',
                    data: parseMapData('squad', snames, mapStats)
                },
                {
                    label: 'Solo FPP',
                    backgroundColor: 'rgb(241, 81, 82)',
                    data: parseMapData('solo-fpp', snames, mapStats)
                },
                {
                    label: 'Duo FPP',
                    backgroundColor: 'rgb(53, 59, 60)',
                    data: parseMapData('duo-fpp', snames, mapStats)
                },
                {
                    label: 'Squad FPP',
                    backgroundColor: 'rgb(64, 112, 118)',
                    data: parseMapData('squad-fpp', snames, mapStats)
                }
            ],
        },
        options: {
            tooltips: {
                displayColors: true,
            },
            scales: {
            xAxes: [{
                stacked: true,
                gridLines: {
                display: false,
                }
            }],
            yAxes: [{
                stacked: true,
                ticks: {
                    min: 0,
                    max: 100.00
                },
                type: 'linear',
            }]
            },
            responsive: true
        }
    });
    const rm = [];
    const b = Object.keys(mapStats).sort();
    for(const mp of snames) {
        let d = [];
        for(const reg of b) {
            let t = 0;
            if(!mapStats[reg][mp]) {
                mapStats[reg][mp] = {
                    solo: 0, duo: 0, squad: 0, solo_fpp: 0, duo_fpp: 0, squad_fpp: 0
                };
            }
            const matches = Object.keys(mapStats[reg][mp]);
            for(const mattype of matches) {
                t += mapStats[reg][mp][mattype];
            }
            let regTot = 0;
            Object.keys(mapStats[reg])
                .forEach(m => {
                    if(m.startsWith('Range')) return ;
                    Object.keys(mapStats[reg][m])
                        .forEach(md => regTot += mapStats[reg][m][md]);
                });
            d.push((t/regTot)*100);
        }
        rm.push({
            label: (mapNames[mp].search(/\(Remastered\)/) !== -1) ? 'Erangel' : mapNames[mp],
            backgroundColor: colors[mp],
            data: d.map(p => parseFloat(p).toFixed(2))
        });
    }
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: b.map(r => {
                if(r === 'Korea') return 'Kor';
                else return MAPPINGS[r][0].toUpperCase() + MAPPINGS[r].substr(1)
            }),
            datasets: rm
        },
        options: {
            tooltips: {
                displayColors: true,
            },
            scales: {
            xAxes: [{
                stacked: true,
                gridLines: {
                display: false,
                }
            }],
            yAxes: [{
                stacked: true,
                ticks: {
                    min: 0,
                    max: 100.00
                },
                type: 'linear',
            }]
            },
            responsive: true,
        }
    });

};

const updateOverview = (activePlayers, pollingSince, matchesCount) => {
    const pcount = document.querySelector('#players-count');
    const totMts = document.querySelector('#total-matches');
    const mapCnt = document.querySelector('#maps-count');
    const totDays = document.querySelector('#total-days');
    const start = moment();
    const end = moment(pollingSince);

    mapCnt.innerHTML = 5;
    pcount.innerHTML = activePlayers;
    totDays.innerHTML = Math.ceil(moment.duration(start.diff(end)).asDays());
    totMts.innerHTML = matchesCount;
};
const getTelemetries = () => {
    $.ajax({
        url: `${BASEURL}getTelemetries`,
        dataType: 'json',
        method: 'GET',
        error: (e, txt, xhr) => console.error(e),
        success: (data, txt, xhr) => {
            TELEMETRY_STATS = data.stats;
            const pc = data.stats.filter(p => p.platform === 'pc');
            const cont = document.querySelector('#tele-container');
            const act = document.querySelector('#steam-player-count');
            const keys = Object.keys(MAPPINGS).sort();

            // add active player count
            act.innerHTML = data.activePlayersSteam;

            let tpp = 0; 
            let fpp = 0;
            pc.forEach(d => {
                const props = Object.keys(d)
                for(const m of props) {
                    switch(m) {
                        case 'solo': case 'duo': case 'squad':
                            tpp += d[m];
                            break;
                        case 'solo_fpp': case 'duo_fpp': case 'squad_fpp':
                            fpp += d[m];
                            break;
                    }
                }
            });
            let tot = tpp + fpp;
            new Chart(document.querySelector('#tpp-fpp'), {
                type: 'pie',
                data: {
                    datasets: [
                        { 
                            data: [((tpp/tot)*100).toFixed(2), ((fpp/tot) * 100).toFixed(2)],
                            fill: true,
                            backgroundColor: [
                                'rgb(92, 128, 188)',
                                'rgb(206, 83, 116)'
                            ] 
                        }
                    ],
                    labels: [
                        'TPP', 'FPP'
                    ]
                }   
            });
            let solo = 0;
            let soloFpp = 0;
            let duo = 0;
            let duoFpp = 0;
            let squad = 0;
            let squadFpp = 0;
            const labs = [ 'Solo', 'Duo', 'Squad', 'solo-Fpp', 'Duo-Fpp', 'Squad-Fpp'];

            pc.forEach(d => {
                solo += d.solo;
                duo += d.duo;
                squad += d.squad;
                soloFpp += d.solo_fpp;
                duoFpp += d.duo_fpp;
                squadFpp += d.squad_fpp;
            });
            const md = [solo, duo, squad, soloFpp, duoFpp, squadFpp];
            const totmd = md.reduce((p, c) => {
                return p + c;
            }, 0);
            const amd = md.map(v => parseFloat((v/totmd * 100).toFixed(2)));
            
            new Chart(document.querySelector('#match-distribution'), {
                type: 'pie',
                data: {
                    datasets: [
                        {
                            data: amd,
                            fill: true,
                            backgroundColor: [
                                'rgb(232, 211, 63)',
                                'rgb(209, 123, 15)',
                                'rgb(183, 173, 207)',
                                'rgb(241, 81, 82)',
                                'rgb(53, 59, 60)',
                                'rgb(64, 112, 118)'
                            ]
                        }
                    ],
                    labels: labs
                }
            });

            // show regional sta
            updateOverview(data.activePlayers, data.pollingSince, data.matchesCount);
            showRegionalModeStats();
            showRegionMapCharts(data.mapNames, data.mapStats);
            document.querySelector('#preloader').classList.remove('active');
            cont.classList.remove('dont-show');
        }
    });
};
