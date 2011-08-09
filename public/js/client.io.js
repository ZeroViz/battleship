var log_event = function (event, data) {
    $('#events').append('<div><p>' + event + '</p><pre>'
                          + JSON.stringify(data) + '</pre></p>');
}

$(document).ready(function () {
    var socket = io.connect();

    socket.on('message', function (msg) {
        log_event('message', msg);
    });

    // Game events

    socket.on('wait', function (data) {
        log_event('wait', data);
    });

    socket.on('engage', function (data) {
        log_event('engage', data);
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
