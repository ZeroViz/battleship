var log4js = require('log4js');
var MatchCoordinator = function (game, coms, options) {
  var log = log4js ? log4js.getLogger('matchcoordinator') : null;
  log.debug('creating match coordinator');

  // game is a reference to the game class that should implement some basic behavior
  // coms is a hash map of player_id's to functions that communicate to clients
  // players is an array of player_id's
  options = options || {};
  options.wait_time = options.wait_time || 0;

  var players = Object.keys(coms);
  var timer = null;
  var moves = null;
  var turn_options = {};

  /**
   * notification functions
   */
  var notify = function (player_id) {
    log.debug('notifing player ' + player_id + ': ' + JSON.stringify(Array.prototype.slice.call(arguments)));
    coms[player_id].apply(null, Array.prototype.slice.call(arguments, 1));
  };
  var broadcast = function () {
    var msg = arguments;
    log.debug('broadcasting ', msg);
    players.forEach(function (player_id) {
      log.debug('broadcasting to ' + player_id, msg);
      coms[player_id].apply(null, msg);
    });
  };

  /**
   * called to start gathering moves within a given timeframe
   * resets the recorded moves
   */
  var start_timer = function (opts) {
    turn_options = opts || {};
    if (options.wait_time > 0) {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      timer = setInterval(stop_timer, options.wait_time);
    } else {
      timer = false;
    }
    moves = {};
  };

  var stop_timer = function () {
    if (timer !== false) {
      clearInterval(timer);
      timer = null;
    }
    post_moves();
  };

  /**
   * called by the player socket when a move event is sent
   */
  var add_move = function (player_id) {
    if (timer !== null) {
      log.debug('adding move for player ' + player_id + ': ' + JSON.stringify(arguments));
      // add move to list of moves for player, turning arguments into proper array
      if (!moves[player_id]) {
        moves[player_id] = [Array.prototype.slice.call(arguments)];
      } else {
        moves[player_id].push(Array.prototype.slice.call(arguments));
      }
      // check if all players have added moves
      if (check_moves()) {
        stop_timer();
      }
    }
  };

  /**
   * check if all players have entered moves
   */
  var check_moves = function () {
    return !players.some(function (player_id) {
      // TODO: allow for different move counts per move type
      var count = turn_options.move_count && turn_options.move_count[player_id] || 1;
      if (!moves[player_id] || moves[player_id].length < count) {
        log.debug('waiting for moves from player ' + player_id);
        return true;
      }
    });
  }

  /**
   * called by the coordinator when all moves have been receieved
   * or when time is up, processes a turn of the game
   */
  var post_moves = function () {
    log.debug('processing moves');
    var results = game.process_moves(moves);
    log.debug('results: ' + JSON.stringify(results));
    players.forEach(function (player_id) {
      log.debug('results for player ' + player_id + ': ' + JSON.stringify(results[player_id]));
      if (results[player_id]) {
        notify.apply(null, [player_id].concat(results[player_id]));
      }
    });
  };

  /**
   * public interface
   */
  var that = {};
  that.add_move = add_move;
  that.start_timer = start_timer;
  that.broadcast = broadcast;
  that.notify = notify;
  return that;
}

module.exports = MatchCoordinator;
