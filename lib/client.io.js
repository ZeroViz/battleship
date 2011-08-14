var log4js = {
    getLogger: function (name) {
        var log = function (level) {
            var prefix = '[' + level.toUpperCase() + '] ' + name + ' - ';
            return function (event, data) {
                var msg = prefix + event + ': ' + JSON.stringify(data);
                if (console[level]) {
                    console[level](msg);
                } else {
                    console.error('console.' + level + ' not defined');
                    console.error(msg);
                }
            };
        };
        return {
            trace: log('trace'),
            debug: log('debug'),
            info: log('info'),
            warn: log('warn'),
            error: log('error')
        };
    }
};

var log = log4js.getLogger('client.io');

var BSClient = (function () {
  var ui = {};
  var init = function (socket) {
    ui.games = $('#games');
    ui.emit_button = $('#emit_button');
    ui.emit_event = $('#emit_event');
    ui.emit_data = $('#emit_data');
    ui.emit_button.click(function () {
        var event = $('#emit_event').val();
        var data = $('#emit_data').val();
        try {
            data = data === '' ? null : JSON.parse(data);
            socket.emit(event, data);
        } catch (err) {
            alert('bad event data json ' + JSON.stringify(err));
        }
    });
  }
  var create_game = function (options) {
    var game = Battleship.create_game(options);
    var gamesec = $('<section class="game" id="game' + options.id + '" />');
    var grid = $('<div class="grid" id="' + options.id + '_grid" />')
      .appendTo(gamesec);
    for (var x = 0, xlen = game.ruleset.size[0]; x < xlen; ++x) {
      var file = String.fromCharCode(97 + x);
      for (var y = 0, ylen = game.ruleset.size[1]; y < ylen; ++y) {
        var rank = (y + 1).toString();
        var cell = file + rank;
        var grid_cell = $('<div class="grid_cell grid_rank_' + rank + 
            ' grid_file_' + file + '" id="' + cell + '">' + cell + '</div>')
          .appendTo(grid);
      }
    }
    ui.games.append(gamesec);
  }
  var that = {};
  that.init = init;
  that.create_game = create_game;
  return that;
})();

$(document).ready(function () {

    var socket = io.connect();

    socket.on('message', function (msg) {
        log_event('message', msg);
    });

    // Game events

    socket.on('wait', function (data) {
        log.info('wait', data);
    });

    socket.on('engage', function (data) {
        log.info('engage', data);
        BSClient.create_game(data);
    });

    socket.on('report', function (data) {
        log_event('report', data);
    });

    socket.on('conclude', function (data) {
        log_event('conclude', data);
    });

    socket.on('connect', function () {
        $('#emit_button').removeAttr('disabled');
    });

  BSClient.init(socket);
});
