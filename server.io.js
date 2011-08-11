
/**
 * Module dependencies.
 */

var log4js = require('log4js'),
    log = log4js.getLogger('server.io');
var Battleship = require('./battleship');
 
/**
 * Battleship Game Stuff
 */

var players = {};

var get_player_id = function (sessionID) {
    if (!players[sessionID]) {
        players[sessionID] = Object.keys(players).length + 1;
        log.debug('session %s given player id %s',
                  sessionID, players[sessionID]);
    }
    return players[sessionID];
};

var player_socket = {};
var notify_players = function (game, event, data) {
    game.players.forEach(function (player_id) {
        log.debug('emitting game %s to player %s - %s: %s',
                  game.id,
                  player_id,
                  event,
                  JSON.stringify(data));
        player_socket[player_id].emit(event, data);
    });
};

var games = [];
var game_waiting = [];
var deploy_waiting = [];
var report_waiting = [];

var on_join = function (socket, data, player_id, game) {
  game_waiting.push([player_id, game]);
  log.debug('player %s added to waiting list', player_id);
  if (game_waiting.length > 1) {
    // create new game
    var game = Battleship.create_game(games.length + 1,
                                      game_waiting.map(function(v){return v[0]}),
                                      { ruleset: {type: 'normal'} } );
    game_waiting.map(function(v){v[1].push(game)});
    games.push(game);
    game_waiting = [];
    // return ruleset object
    var data = { id: game.id,
                 type: 'normal',
                 players: game.players.length }
    log.debug('game %s created with players %s', game.id, game.players);
    notify_players(game, 'engage', data);
  } else {
    // wait for another player
    log.debug('emitting wait to player %s', player_id);
    socket.emit('wait');
  }
}

var on_deploy = function (emit, data, player_id, game) {
    log.debug("player " + player_id + " submitted there fleet");
    var set_report = game.do_deploy(player_id, data, game);
    if (set_report !== null){
        deploy_waiting.push(player_id);
        log.debug("player added to deploy waiting list")
    } else {
        log.debug("sending deploy error report");
        emit("engage", set_report);
    }
    
    if (deploy_waiting.length === 1) {
        log.debug('emitting wait to player %s', player_id);
        emit('wait');
    } else {
        var data = {};
	log.debug('sending placement conforamtion');
	notify_players(game, "report", data);
    }
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
  var game = [];

  player_socket[ s.player_id  ] = socket;

  // Game events

  socket.on('join', function (data) {
    log.debug('event join received %s', JSON.stringify(data));
    on_join(socket, data, player_id, game);	
  });

  socket.on('deploy', function (data){
    log.debug('event deploy received %s', JSON.stringify(data));
    try {
      on_deploy(data, socket, player_id, game[0]);
    } catch (err) {
      socket.emit('engage', { errors: ['bad deploy']});
    }
  });

  socket.on('enact', function (data) {
    log.debug('event enact received %s', JSON.stringify(data));
    try {
      on_enact(data, socket, player_id, game[0]);
    } catch (err) {
      socket.emit('report', { errors: ['bad enact']});
    }
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
