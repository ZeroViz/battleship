var log4js = require('log4js');
var MatchMaker = function (create_game, options) {
  var log = log4js ? log4js.getLogger('matchmaker') : null;
  if (options && options.logLevel) {
    log.setLevel(options.logLevel);
  }

  var waiting = [];
  var add_player = function (player, game_cb) {
    log.debug('adding player ' + player);
    if (typeof player !== 'object') {
      player = { id: player };
    }
    player.matchtype = player.matchtype || 'fifo';
    player.max = player.max || 2;
    player.ruleset = player.ruleset || 'normal';
    var game;
    waiting.some(function (wait, idx) {
      // find game player can join
      if (wait.players.indexOf(player.id) === -1 &&
          wait.matchtype === player.matchtype &&
          wait.max > wait.players.length) {
        log.debug('adding player to ' + wait.matchtype + ' with ' + wait.players);
        joined = true;
        wait.players.push(player.id);
        wait.game_cbs.push(game_cb);
        if (wait.players.length === wait.max) {
          log.debug('creating ' + wait.matchtype + ' game with ' + wait.players);
          // create game
	  game = create_game(wait.players);
	  wait.game_cbs.forEach(function (cb) {
            cb(game);
          });
          // dangeresque
          delete waiting[idx];
        }
        return true;
      }
    });
    if (!game) {
      // add player to new waiting list
      log.debug('adding new wait list for ' + player.matchtype + ' waiting for ' + (player.max-1) + ' more');
      waiting.push({
        matchtype: player.matchtype,
        max: player.max,
        ruleset: player.ruleset,
        players: [player.id],
        game_cbs: [game_cb]
      });
    } else {
      log.debug('passed 2');
      return game;
    }
  };
  var remove_player = function (player) {
    log.debug('removing player ' + player);
    // search for player in waiting lists and remove
    if (typeof player !== object) {
      player = { id: player };
    }
    var remove = [];
    waiting.forEach(function (wait, idx) {
      var player_idx = wait.players.indexOf(player.id);
      if (player_idx !== -1) {
        if (wait.players.length > 1) {
          delete wait.players[player_idx];
          log.debug('player removed from ' + wait.matchtype + ' leaving ' + wait.players);
        } else {
          remove.push(idx);
        }
      }
    });
    // delete waiting game if no players left
    remove.forEach(function (idx) {
      log.debug('player removed and deleted ' + waiting[idx].matchtype);
      delete waiting[idx];
    });
  };

  var that = {
    add_player: add_player,
    remove_player: remove_player,
    log: log
  };
  return that;
};

module.exports = MatchMaker;
