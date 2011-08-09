
/**
 * Module dependencies.
 */

var log4js = require('log4js'),
    log = log4js.getLogger('battleship.io');
 
/**
 * Battleship Game Stuff
 */

var players = {};

function get_player_id(sessionID) {
    if (!players[sessionID]) {
        players[sessionID] = Object.keys(players).length + 1;
        log.debug('session %s given player id %s',
                  sessionID, players[sessionID]);
    }
    return players[sessionID];
};

var games = [];

function join_game(player_id) {
    log.debug('player %s joining game', player_id);
    // look for waiting game
    for (var i = 0, len = games.length; i < len; ++i) {
        if (games[i].players.length === 1 && games[i].players[0] !== player_id) {
            // add to waiting game
            games[i].players.push(player_id);
            return games[i];
        }
    }
    // create new game
    var game = { id: games.length + 1,
                 players: [player_id] };
    games.push(game);
    return game;
};

var on_join = function (emit, data, player_id) {
    var game = join_game(player_id);
    if (game.players.length === 1) {
        log.debug('emitting wait to player %s, game %s', player_id, game.id);
        emit('wait');
    } else {
        // return ruleset object
        log.debug('emitting engage to player %s, game %s', player_id, game.id);
        emit('engage',
             { id: game.id,
               type: 'normal',
               players: game.players.length }
            );
        // TODO: emit an 'engage' to opponents somehow
        // probably by adding an anonymous function to a queue
        // that is processed with a game "event" (non-socket)
    }
    return game;
}

var on_deploy = function (emit, data, player_id, game) {
    // add fleet to sea object 
    // and emit 'report', null
}

var on_enact = function (emit, data, player_id, game) {
    // add action to sea object 
    // and emit 'report', list of reports
    // or emit 'conclude', full game state
}

/**
 * Event Routing
 */

var on_connection = function (socket) {
    log.trace('on_connection');

    var hs = socket.handshake;
    var s = hs.session;

    if (!s.player_id) {
        s.player_id = get_player_id(hs.sessionID);
    }
    var player_id = s.player_id;
    var game;

    // Game events

    socket.on('join', function (data) {
        log.debug('event join received %s', JSON.stringify(data));
        game = on_join(socket.emit.bind(socket), data, player_id);
    });

    socket.on('deploy', function (data) {
        on_deploy(data, socket, player_id, game);
    });

    socket.on('enact', function (data) {
        on_enact(data, socket, player_id, game);
    });

    // Standard events

    socket.on('error', function (err) {
        log.error('socket error: ' + err);
    });

    socket.on('disconnect', function () {
        log.trace('on_disconnect');
    });
}

// Exports

module.exports = function (io) {
    io.sockets.on('connection', on_connection);
};
