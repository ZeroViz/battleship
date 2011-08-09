var log4js = {
    getLogger: function (name) {
        var log = function (level) {
            var prefix = '[' + level.toUpperCase() + '] ' + name + ' - ';
            return function (event, data) {
                var msg = prefix + event + ': ' + JSON.stringify(data);
                if (console[level]) {
                    console[level](msg);
                } else {
                    console.error('console.' + level + ' not defined');
                    console.error(msg);
                }
            };
        };
        return {
            trace: log('trace'),
            debug: log('debug'),
            info: log('info'),
            warn: log('warn'),
            error: log('error')
        };
    }
};

var log = log4js.getLogger('client.io');

$(document).ready(function () {
    var socket = io.connect();

    socket.on('message', function (msg) {
        log_event('message', msg);
    });

    // Game events

    socket.on('wait', function (data) {
        log.info('wait', data);
    });

    socket.on('engage', function (data) {
        log.info('engage', data);
    });

    socket.on('report', function (data) {
        log_event('report', data);
    });

    socket.on('conclude', function (data) {
        log_event('conclude', data);
    });

    socket.on('connect', function () {
        socket.emit('join');
    });
});
