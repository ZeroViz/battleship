var log4js = require('log4js');
var MatchCoordinator = function (game, coms, options) {
  var players = Object.keys(coms);
  var log = log4js ? log4js.getLogger('matchcoordinator') : null;
  log.debug('creating match coordinator');
  // game is a reference to the game class that should implement some basic behavior
  // coms is a hash map of player_id's to functions that communicate to clients
  // players is an array of player_id's
  options = options || {};
  options.wait_time = options.wait_time || 0;
  var timer = null;
  var moves = null;
  var notify = function (player_id) {
    coms[player_id].apply(null, Array.prototype.slice(coms, 1));
  };
  var broadcast = function () {
    players.forEach(function (player_id) {
      coms[player_id].apply(null, arguments);
    });
  };
  /**
   * called to start gathering moves within a given timeframe
   * resets the recorded moves
   */
  var start_timer = function () {
    if (options.wait_time > 0) {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      timer = setInterval(stop_timer, options.wait_time);
    }
    moves = {};
  };
  var stop_timer = function () {
    clearInterval(timer);
    timer = null;
    post_moves();
  };
  /**
   * called by the player socket when a move event is sent
   */
  var add_move = function (player_id, event, data) {
    if (timer !== null) {
      moves[player_id] = arguments;
    }
    // check if all players have added moves
    if (check_moves) {
      stop_timer();
    }
  };
  /**
   * check if all players have entered moves
   */
  var check_moves = function () {
    players.forEach(function (player_id) {
      if (!moves[player_id]) {
        return false;
      }
    });
    return true;
  }
  /**
   * called by the coordinator when all moves have been receieved
   * or when time is up, processes a turn of the game
   */
  var post_moves = function () {
    players.forEach(function (player_id) {
      if (moves[player_id]) {
        game.do_move.apply(game, moves[player_id]);
      } else {
        game.do_move(player_id, {});
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
