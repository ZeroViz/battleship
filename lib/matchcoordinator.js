var log4js = require('log4js');
var MatchCoordinator = function (game, coms, options) {
  options = options || {};
  options.wait_time = options.wait_time || 30000;
  var timer = null;
  var moves = null;
  var notify = function (player_id) {
  };
  var broadcast = function () {
  };
  var start_timer = function () {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    moves = {};
    timer = setInterval(stop_timer, options.wait_time);
  };
  var stop_timer = function () {
    clearInterval(timer);
    timer = null;
    post_moves();
  };
  var add_move = function (player_id, event, data) {
    if (timer !== null) {
      moves[player_id] = arguments;
    }
  };
  var post_moves = function () {
    coms.keys.forEach(function (player_id) {
      if (moves[player_id]) {
        game.do_move.apply(game, moves[player_id]);
      } else {
        game.do_move(player_id, {});
      }
    });
  };
  var that = {};
  return that;
}
