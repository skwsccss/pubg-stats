// A TCP Client for the Remote Console Interface 

const net = require('net');
const { RConHanlderNotDefined } = require('./errors');

module.exports = class RConClient {
    constructor(dataHandler, closeHandler, connectionHandler = null) {
        this.client = new net.Socket();
        this.dataHandler = dataHandler;
        this.closeHandler = closeHandler;
        this.connectionHandler = connectionHandler;

        if(!this.dataHandler) {
            throw new RConHanlderNotDefined('RConClient');
        }
        this.client.on('data', this.dataHandler);
        this.client.on('close', this.closeHandler);
    }
    
    connection(host, port, cb) {
        // cb is connection handler
        if(!cb && !this.connectionHandler) {
            this.connectionHandler = () => console.log('RCon client connected at ' + host + ' ' + port);
        }
        this.client.connect(port, host);
        this.client.on('connect', cb);
    }
    sendCmd(buffer) {
        this.client.write(buffer);
    }
};