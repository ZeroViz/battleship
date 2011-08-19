
/**
 * Module dependencies.
 */

var log4js = require('log4js'),
    log = log4js.getLogger('server.io');
var GameProvider = require('./gameProvider.js').GameProvider;
var Battleship = require('./battleship');
var MatchMaker = require('./matchmaker.js');
var gameProvider = new GameProvider('localhost', 27017);
var redis = require('redis').createClient();

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
  game.players.forEach(function (player) {
    log.debug('emitting game %s to player %s - %s: %s',
      game.id,
      player.id,
      event,
      JSON.stringify(data));
    player_socket[player.id].emit(event, data);
  });
};

var games = [];
var deploy_waiting = [];
var report_waiting = [];
var create_game = function (players) {
  redis.incr('game_id', function (err, game_id) {
    var game = Battleship.create_game({
      id: game_id,
      players: players.splice(0),
      ruleset: 'normal'
    });
    gameProvider.save(game, function (error, docs) {
      log.debug('game ' + game_id + ' saved to mongodb');
    });
    return game;
  });
};

var matchmaker = MatchMaker(create_game);

var on_join = function (socket, data, player_id, game_cb) {
  var game = matchmaker.add_player(player_id, game_cb);
  if (game) {
    // return ruleset object
    notify_players(game, 'engage', { id: game.id,
                                     type: 'normal',
                                     players: game.players });
    log.debug('game %s created with players %s', game.id, game.players);
  } else {
    // wait for more players, notify clients of status
    log.debug('emitting wait to player %s', player_id);
    socket.emit('wait', { players_needed: 1 });
  }
};

var on_deploy = function (emit, data, player_id, game) {
  log.debug("player " + player_id + " submitted their fleet");
  var set_report = game.do_deploy(player_id, data, game);
  if (set_report !== null) {
    deploy_waiting.push(player_id);
    log.debug("player added to deploy waiting list");
  } else {
    log.debug("sending deploy error report");
    emit("engage", set_report);
  }

  if (deploy_waiting.length === 1) {
    log.debug('emitting wait to player %s', player_id);
    emit('wait');
  } else {
    log.debug('sending placement conforamtion');
    notify_players(game, "report", {});
  }
};

var on_enact = function (emit, data, player_id, game) {
  // add action to sea object
  // and emit 'report', list of reports
  // or emit 'conclude', full game state
};

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
  var game = null;

  socket.emit('info', { message: 'session: ' + hs.sessionID });
  socket.emit('info', { message: 'player id: ' + player_id });
  player_socket[s.player_id] = socket;

  // Game events

  socket.on('join', function (data) {
    log.debug('event join received %s', JSON.stringify(data));
    // callback is used to set the game reference when it is created
    on_join(socket, data, player_id, function (g) {
      game = g;
    });
    log.debug("passed on join")
  });

  socket.on('deploy', function (data) {
    log.debug('event deploy received %s', JSON.stringify(data));
    try {
      if (!game) {
        throw { name: 'DeployError', message: 'game is undefined' };
      }
      on_deploy(data, socket, player_id, game);
    } catch (err) {
      socket.emit('engage', { errors: ['bad deploy', err]});
    }
  });

  socket.on('enact', function (data) {
    log.debug('event enact received %s', JSON.stringify(data));
    try {
      if (!game) {
        throw { name: 'DeployError', message: 'game is undefined' };
      }
      on_enact(data, socket, player_id, game);
    } catch (err) {
      socket.emit('report', { errors: ['bad enact', err]});
    }
  });

  // Standard events

  socket.on('error', function (err) {
    log.error('socket error: ' + err);
  });

  socket.on('disconnect', function () {
    log.trace('on_disconnect');
  });
};

// Exports

exports.listen = function (io) {
  io.sockets.on('connection', on_connection);
};
