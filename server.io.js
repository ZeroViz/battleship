
/**
 * Module dependencies.
 */

var log4js = require('log4js'),
    log = log4js.getLogger('server.io');
 
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
var waiting = [];

function join_game(player_id) {
  
    if (waiting.length === 0) {
      waiting.push(player_id);
      log.debug('player %s added to waiting list', player_id);
    }
    else {
      // create new game
      log.debug('player %s added to start game', player_id);
      waiting.push(player_id);
      var game = Battleship.create(games.length + 1, waiting, { ruleset: 'normal' } );
      games.push(game);
      return game;
    }

};

var on_join = function (emit, data, player_id) {
    var game = join_game(player_id);
    if (waiting.length === 1) {
        log.debug('emitting wait to player %s', player_id);
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
