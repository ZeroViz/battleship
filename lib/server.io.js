
/**
 * Module dependencies.
 */

var log4js = require('log4js'),
    log = log4js.getLogger('server.io');
var GameProvider = require('./gameProvider').GameProvider;
var Battleship = require('./battleship');
var gameProvider = new GameProvider('game');
var idProvider = new GameProvider('id');
var MatchMaker = require('./matchmaker');
var MatchCoordinator = require('./matchcoordinator');

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

var create_game = function (players, callback) {
  idProvider.getUniqueId('saves', function(error, game_id) { 
    var game = Battleship.create_game({
      id: game_id,
      players: players.slice(0),
      ruleset: 'normal'
    });
    game._id = game_id;
    gameProvider.save(game, function (error, docs) {
      log.debug('game ' + game_id + ' saved to mongodb');
    });
    callback(game);
  });
};

var matchmaker = MatchMaker(create_game);
var mcs = {};

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

var on_deploy = function (data, emit, player_id, game) {
  log.debug("player " + player_id + " submitted their fleet");
  var send_report = game.do_deploy(player_id, data);
  if (send_report !== null) {
    deploy_waiting.push(player_id);
    log.debug("player added to deploy waiting list");
  } else {
    log.debug("sending deploy error report");
    emit("engage", send_report);
  }

  if (deploy_waiting.length !== game.compacity) {
    log.debug('emitting wait to player %s', player_id);
    emit('wait');
  } else {
    log.debug('sending placement conforamtion');
    notify_players(game, "report", {});
  }
};

var on_enact = function (emit, data, player_id, game) {
  log.debug("player " + player_id + " submitted an action");
  var report = game.do_enact(player_id, data);
  if (report !== null){
    enact_waiting.push(player_id);
    log.debug("player added to enact waiting");
  } else {
    log.debug("sending enact error report");
    emit("report", report);
  }

  if (enact_waiting !== game.compacity) {
    log.debug('emitting wait to player %s', player_id);
    emit('wait');
  } else {
    log.debug('sending damage report');
    notify_players(game, "report", report);
  }
  // or emit 'conclude', full game state
};

/**
 * Event Routing
 */

var on_connection = function (socket) {
  var hs = socket.handshake;
  var s = hs.session;

  if (!s.player_id) {
    s.player_id = get_player_id(hs.sessionID);
  }
  var player_id = s.player_id;

  socket.emit('info', { message: 'session: ' + hs.sessionID });
  socket.emit('info', { message: 'player id: ' + player_id });

  // Game events

  socket.on('join', function (data) {
    log.debug('event join received %s', JSON.stringify(data));
    var player = {
      id: player_id,
      com: socket.emit.bind(socket)
    }
    var players = matchmaker.add_player(player, data);
    if (players) {
      // TODO: provide feedback for who joined games, so mc must have partial list of coms
      create_game(players, function (game) {
        var coms = {};
        players.forEach(function (player) {
          coms[player.id] = player.com;
        });
        var mc = MatchCoordinator(game, coms);
        mc.broadcast('engage', { id: game.id,
                                 type: 'normal',
                                 players: game.players });
        mc.start_timer();
        mcs[game.id] = mc;
        log.debug('game %s created with players %s', game.id, game.players);
      });
    } else {
      // wait for more players, notify clients of status
      log.debug('emitting wait to player %s', player_id);
      socket.emit('wait');
    }
  });

  socket.on('deploy', function (game_id, data) {
    log.debug('event deploy received %s', JSON.stringify(data));
    try {
      if (!mcs[game_id]) {
        throw { name: 'DeployError', message: 'game is undefined' };
      }
      log.debug("player " + player_id + " submitted their fleet");
      mcs[game_id].add_move(player_id, 'deploy', data);
    } catch (err) {
      socket.emit('engage', { errors: ['bad deploy', err]});
    }
  });

  socket.on('enact', function (game_id, data) {
    log.debug('event enact received %s', JSON.stringify(data));
    try {
      if (!mcs[game_id]) {
        throw { name: 'EnactError', message: 'game is undefined' };
      }
      log.debug('player ' + player_id + ' submitted an action');
      mcs[game_id].add_move(player_id, 'enact', data);
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
