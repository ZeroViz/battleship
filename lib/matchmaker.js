var log4js = require('log4js');
var MatchMaker = function (options) {
  var log = log4js ? log4js.getLogger('matchmaker') : null;
  if (options && options.logLevel) {
    log.setLevel(options.logLevel);
  }

  var waiting = [];
  var add_player = function (player, options) {
    if (typeof player !== 'object') {
      player = { id: player };
    }
    options = options || {};
    options.matchtype = options.matchtype || 'fifo';
    options.max = options.max || 2;
    options.ruleset = options.ruleset || 'normal';
    log.debug('adding player ' + player.id + ' with options ' +
              JSON.stringify(options));
    var wait_game;
    if (waiting.some(function (wait, idx) {
      // find game player can join
      if (!wait.players.some(function (wait_player) {
            return wait_player.id === player.id;
          }) &&
          wait.matchtype === options.matchtype &&
          options.max > wait.players.length) {
        log.debug('adding player to ' + wait.matchtype + ' with ' + wait.players);
        wait.players.push(player);
        if (wait.players.length === wait.max) {
          log.debug('creating ' + wait.matchtype + ' game with ' + wait.players);
          // dangeresque
          wait_game = waiting[idx];
          delete waiting[idx];
        }
        return true;
      }
    })) {
      if (wait_game) {
        log.debug('returning player list from: ' + JSON.stringify(wait_game));
        return wait_game.players;
      }
    } else {
      // add player to new waiting list
      log.debug('adding new wait list for ' + options.matchtype +
          ' waiting for ' + (options.max - 1) + ' more');
      waiting.push({
        matchtype: options.matchtype,
        max: options.max,
        ruleset: options.ruleset,
        players: [player]
      });
    }
    return null;
  };
  var remove_player = function (player) {
    // search for player in waiting lists and remove
    if (typeof player !== 'object') {
      player = { id: player };
    }
    log.debug('removing player ' + player.id);
    var remove = [];
    waiting.forEach(function (wait, idx) {
      wait.players.some(function (wait_player, player_idx) {
        if (wait_player.id === player.id) {
          wait.players.splice(player_idx, 1);
          // delete wait.players[player_idx];
          log.debug('player removed from ' + wait.matchtype + ' leaving ' + wait.players);
          return true;
        }
      });
      if (wait.players.length === 0) {
        remove.push(idx);
      }
    });
    // delete waiting game if no players left
    remove.forEach(function (idx) {
      log.debug('player removed and deleted ' + waiting[idx].matchtype);
      delete waiting[idx];
    });
  };
  var get_waiting = function () {
    return waiting;
  };

  var that = {
    add_player: add_player,
    remove_player: remove_player,
    get_waiting: get_waiting,
    log: log
  };
  return that;
};

module.exports = MatchMaker;
