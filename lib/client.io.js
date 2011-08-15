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
    ui.tt = $('#eventlist');
  }
  var tt = function (msg) {
    var p = $('<p>').appendTo(ui.tt);
    var l = 0;
    var tt1 = function () {
      if (msg[l] !== ' ') {
        $('#tt')[0].play();
      }
      l += 1;
      p.text(msg.substring(0, l));
      if (l < msg.length) {
        window.setTimeout(tt1, Math.floor(Math.random()*100+75));
      }
    };
    window.setTimeout(tt1, 1);
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
  that.tt = tt;
  return that;
})();

var resize_area = function () {
  var gameArea = document.getElementById('area');
  var widthToHeight = 4 / 3;
  var newWidth = window.innerWidth;
  var newHeight = window.innerHeight;
  var newWidthToHeight = newWidth / newHeight;

  if (newWidthToHeight > widthToHeight) {
    newWidth = newHeight * widthToHeight;
    gameArea.style.height = newHeight + 'px';
    gameArea.style.width = newWidth + 'px';
  } else {
    newHeight = newWidth / widthToHeight;
    gameArea.style.width = newWidth + 'px';
    gameArea.style.height = newHeight + 'px';
  }

  gameArea.style.marginTop = (-newHeight / 2) + 'px';
  gameArea.style.marginLeft = (-newWidth / 2) + 'px';
  gameArea.style.fontSize = (newWidth / 400) + 'em';
};

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

  window.addEventListener('resize', resize_area, false);
  window.addEventListener('orientationchange', resize_area, false);
  resize_area();
  var random_message = (function () {
    var phonic = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf',
      'hotel', 'india', 'juliett', 'kilo', 'lima', 'mike', 'november', 'oscar',
      'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor',
      'whiskey', 'x-ray', 'yankey', 'zulu', 'one', 'two', 'three', 'four', 'five',
      'six', 'seven', 'eight', 'nine', 'zero'];
    return function () {
      var l = Math.floor(Math.random()*5)+2;
      var m = '';
      for (var i = 0; i < l; ++i) {
        m += phonic[Math.floor(Math.random()*phonic.length)] + ' ';
      }
      BSClient.tt(m);
      window.setTimeout(random_message, Math.floor(Math.random()*15000) + 3000);
    };
  }());
  window.setTimeout(random_message, 5000);
});
