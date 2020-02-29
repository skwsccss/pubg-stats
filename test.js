/*const RConClient = require('./rcon-client');
const { 
    generateMatchID, getAllPlayerMatches, sleep,
    RConClientRequest, RConResponseHandler
} = require('./utils');

console.log('[-] Preparing RCON Client');
const rcon = new RConClient(RConResponseHandler, () => {
    console.log('[-] Connection to RCON closed');
});
rcon.connection('155.133.248.35', 27015, () => {
    console.log('[-] Connected to RCON server at ' + '155.133.248.34' + ' ' + '27015');
    rcon.sendCmd(RConClientRequest(2, 8080, 'status'));
});*/

const RCon = require('srcds-rcon');
const rcon = RCon({
    address: '153.133.234.1',
    port: 27015,
});
rcon.connect()
    .then(() => {
        return rcon.command('status')
    })
    .then(status => {
        console.log(status);
    })
    .catch(err => {
        console.log('Error while connecting to server');
        console.error(err);
    });
   // .finally(rcon.disconnect());