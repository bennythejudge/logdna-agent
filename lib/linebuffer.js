var debug = require('debug')('logdna:lib:linebuffer');
var log = require('./log');
var config = require('./config');

var buf = [];
var socket;
var flushtimeout;
var dccount = 0;

module.exports.addMessage = function (message) {
    if (buf.length > config.BUF_LIMIT) {
        debug('buffer limit exceeded');
        return;
    }

    if (message.length > 32000) {
        message = message.substring(0, 32000) + ' (cut off, too long...)';
    }

    buf.push(message);

    // flush immediately if limit reached
    if (buf.length === config.FLUSH_LIMIT) {
        debug('flush limit reached, flushing...');
        clearTimeout(flushtimeout);
        exports.flush();
    }
};

module.exports.flush = function () {
    flushtimeout = setTimeout(exports.flush, config.FLUSH_INTERVAL);
    if (buf.length === 0) return;
    if (!socket) return;
    if (!socket.connected) {
        dccount = buf.length;
        return;
    }

    var sendbuf = buf;
    buf = [];

    for (var i = 0; i < sendbuf.length; i++) {
        debug('sending data: ' + sendbuf[i].length);
        if (!sendbuf[i] || sendbuf[i].length === 0) continue;

        socket.send(sendbuf[i]);
    }
    sendbuf = null;

    if (dccount > 0) {
        log('Sent ' + dccount + ' lines queued from earlier disconnection');
        dccount = 0;
    }
};

module.exports.setSocket = function (sock) {
    socket = sock;

    // kick off initial flush
    if (!flushtimeout) {
        flushtimeout = setTimeout(exports.flush, config.FLUSH_INTERVAL);
    }
};