
/**
 * Module dependencies.
 */

var log4js = require('log4js'),
    log = log4js.getLogger('server.io');
var GameProvider = require('./gameProvider').GameProvider;
var Battleship = require('./battleship');
var MatchMaker = require('./matchmaker');
var MatchCoordinator = require('./matchcoordinator');
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

var create_game = function (players, callback) {
  redis.incr('game_id', function (err, game_id) {
    var game = Battleship.create_game({
      id: game_id,
      players: players.slice(0),
      ruleset: 'normal'
    });
    gameProvider.save(game, function (error, docs) {
      log.debug('game ' + game_id + ' saved to mongodb');
    });
    callback(game);
  });
};

var matchmaker = MatchMaker(create_game);
var mcs = {};

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
        var mc = MatchCoordinator(game, players.map(function (player) {
          return player.com;
        }));
        mc.broadcast('engage', { id: game.id,
                                 type: 'normal',
                                 players: game.players });
        mc.start_timer();
        msc[game.id] = mc;
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
      if (!msc[game_id]) {
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
