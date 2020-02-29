module.exports = {
    generateMatchID: function*(matches) {
        let count = 0;
        for(let match of matches) {
            if(count >= 5) {
                yield { pause: true };
                count = 0;
            }
            else {
                yield match.id;
            }
            count++;
        }
    },
    getAllPlayerMatches: async (gen, api, mapNames) => {
        try {
            let matchid = gen.next();
            while(!matchid.value.pause && !matchid.done) {
                let match = await api.getMatches(matchid.value);
                let data = match.data.data;
                // print 
                console.log(`MatchID: ${data.id} 
                    GameMode: ${data.attributes.gameMode}  
                    MapName: ${mapNames[data.attributes.mapName]}
                    IsCustomMatch: ${data.attributes.isCustomMatch}
                    SeasonState: ${data.attributes.seasonState}
                    
                `);
                //console.log(data.relationships.rosters.data);
                matchid = gen.next();
            }
            if(matchid.done) {
                console.log('[*] Fetched all matches');
            }
            else {
                console.log('[*] Pausing for 10 seconds');
            }
        } catch(fetchMatchErr) {
            console.log('[!] Error while fetching match');
            console.error(fetchMatchErr);
        }
    },
    sleep: async (timeInMs) => {
        await new Promise(resolve => {
            setTimeout(resolve, timeInMs);
        });
    },
    RConResponseHandler: (buffer) => {
        console.log('Got Buffer Response');
        return {
            size: buffer.readInt32LE(0),
            id: buffer.readInt32LE(4),
            type: buffer.readInt32LE(8),
            body: buffer.toString('ascii', 12, buffer.length-2)
        };
    },
    RConClientRequest: (type, id, body) => {
        const size = Buffer.byteLength(body) + 14;
        const buffer = new Buffer(size);

        buffer.writeInt32LE(size-4, 0);
        buffer.writeInt32LE(id, 4);
        buffer.writeInt32LE(type, 8);
        buffer.write(body, 12, size-2, 'ascii');
        buffer.writeInt16LE(0, size-2);

        return buffer;
    }
};