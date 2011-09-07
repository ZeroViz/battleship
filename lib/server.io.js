
/**
 * Module dependencies.
 */

var log4js = require('log4js'),
    log = log4js.getLogger('server.io');
var GameProvider = require('./gameProvider').GameProvider;
var Battleship = require('./battleship');
var gameProvider = new GameProvider('game');
var idProvider = new GameProvider('id');
var playerProvider = new GameProvider('player');
var MatchMaker = require('./matchmaker');
var MatchCoordinator = require('./matchcoordinator');

/**
 * Battleship Game Stuff
 */

var players = {};
var get_player_id = function (sessionID, callback) {
  playerProvider.findOne({session_id: sessionID}, function (error, player) {
    log.debug('Session ID: ' + sessionID );
    if (!player) {
      idProvider.getUniqueId('player', function (error, player_id) {
        player = {_id: player_id, session_id: sessionID}
        playerProvider.save(player, function (error, docs) {
          log.debug('player saved: ' + JSON.stringify(player) );
        });
        callback(null, player._id);
      });
    }
    else {
      log.debug('found player: ' + JSON.stringify(player) );
      callback(null, player._id);
    }
  });
};

var create_game = function (players, callback) {
  idProvider.getUniqueId('saves', function (error, game_id) {
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

/**
 * Event Routing
 */

var on_connection = function (socket) {
  log.trace('on_connection');
  var hs = socket.handshake;
  var s = hs.session;

  get_player_id(hs.sessionID, function(error, player_id) {
    socket.emit('info', { message: 'session: ' + hs.sessionID });
    socket.emit('info', { message: 'player id: ' + player_id });
    log.debug('session %s given player id %s',
          hs.sessionID, player_id);

    // Game events

    socket.on('join', function (data) {
      gameProvider.findOne({players: {id: player_id}}, function(error, game) {
        socket.emit('wait', { id: player_id });
        socket.emit('info', { message: 'joining...'});
        log.debug('event join received %s', JSON.stringify(data));
        var player = {
          id: player_id,
          com: socket.emit.bind(socket)
        };
        socket.emit('info', { message: 'test socket message' });
        player.com('info', { message: 'test com message' });

        if (game) {
          log.debug('Resume game %s for player %s', game.id, player_id);
          mc = mcs[game.id];
          mc.broadcast('engage', { id: game.id,
                                   type: 'normal',
                                   players: game.players });
        }
        else {
          var players = matchmaker.add_player(player, data);
          if (players) {
            // TODO: provide feedback for who joined games, so mc must have partial list of coms
            create_game(players, function (game) {
              log.debug('game created with id ' + game.id);
              var coms = {};
              players.forEach(function (player) {
                coms[player.id] = player.com;
              });
              var mc = MatchCoordinator(game, coms);
              mc.broadcast('engage', { id: game.id,
                                       type: 'normal',
                                       players: game.players });
              mc.start_game();
              mcs[game.id] = mc;
              log.debug('game %s created with players %s', game.id, game.players);
            });
          }
        }
      });
    });

    socket.on('deploy', function (game_id, data) {
      log.debug('event deploy received for game %d: %s', game_id, JSON.stringify(data));
      try {
        if (!mcs[game_id]) {
          throw { name: 'DeployError', message: 'game is undefined' };
        }
        log.debug("player " + player_id + " submitted their fleet");
        mcs[game_id].add_move(player_id, 'deploy', data);
        gameProvider.findById(game_id, function(error, game) {
          update = {}
          update.data = {}
          update._id = game_id;
          update.data['seas'] = game['seas'];
          update.data['seas'][player_id]['fleet'] = data;
          gameProvider.update(update, function (error, docs) {
            log.debug('game ' + game_id + ' was updated in mongodb');
          });
        });
      } catch (err) {
        log.error(err);
      }
    });

    socket.on('enact', function (game_id, data) {
      log.debug('event enact received for game %d, %s', game_id, JSON.stringify(data));
      try {
        if (!mcs[game_id]) {
          throw { name: 'EnactError', message: 'game is undefined' };
        }
        log.debug('player ' + player_id + ' submitted an action');
        mcs[game_id].add_move(player_id, 'enact', data);
        gameProvider.findById(game_id, function(error, game) {
          update = {}
          update.data = {}
          update._id = game_id;
          update.data['seas'] = game['seas'];
          update.data['seas'][player_id]['actions'].push( data );
          gameProvider.update(update, function (error, docs) {
            log.debug('game ' + game_id + ' was updated in mongodb');
          });
        });
      } catch (err) {
        log.error(err);
      }
    });

    // Standard events

    socket.on('error', function (err) {
      log.error('socket error: ' + err);
    });

    socket.on('disconnect', function () {
      log.trace('on_disconnect');
    });
  });
};

// Exports

exports.listen = function (io) {
  io.sockets.on('connection', on_connection);
};
