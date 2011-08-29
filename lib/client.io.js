/*global Battleship io */
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
  var games = {};
  ui.nav = $('#nav');
  ui.tabs = [];
  var display_tab = function (show) {
    ui.tabs.forEach(function (tab) {
      tab === show ? tab.show() : tab.hide();
    });
  };
  var register_tab = function (tab_name) {
    var tab = ui[tab_name + '_tab'] = $('#' + tab_name);
    ui.tabs.push(tab);
    var button = ui[tab_name + '_button'] = $('#' + tab_name + '_button')
      .click(function () {
        display_tab(tab);
      })
      .css('cursor', 'pointer');
  };
  // messages
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
        window.setTimeout(tt1, Math.floor(Math.random() * 100 + 75));
      }
    };
    window.setTimeout(tt1, 1);
  };

  var init = function (socket) {
    // connect ui elements to code
    // main buttons
    register_tab('splash');
    register_tab('lobby');
    register_tab('controls');
    // controls tab
    ui.games = $('#games');
    ui.deploy_button = $('#deploy_button');
    ui.deploy_data = $('#deploy_data');
    ui.enact_button = $('#enact_button');
    ui.enact_data = $('#enact_data');
    ui.deploy_button.click(function () {
      try {
        var data = ui.deploy_data.val();
        data = data === '' ? null : JSON.parse(data);
        socket.emit('deploy', Object.keys(games)[0], data);
      } catch (err) {
        tt('invalid deploy json ' + JSON.stringify(err));
      }
    });
    ui.enact_button.click(function () {
      try {
        var data = ui.enact_data.val();
        data = data === '' ? null : JSON.parse(data);
        socket.emit('enact', Object.keys(games)[0], data);
      } catch (err) {
        tt('invalid enact json ' + JSON.stringify(err));
      }
    });
    ui.tt = $('#eventlist');
  };
  var create_game = function (options) {
    var game = Battleship.create_game(options);
    var gamesec = $('<section class="game" id="game' + options.id + '" />');
    var grid = $('<div class="grid" id="' + options.id + '_grid" />')
      .appendTo(gamesec);
    for (var x = 0, xlen = game.ruleset.size[0]; x < xlen; x += 1) {
      var file = String.fromCharCode(97 + x);
      for (var y = 0, ylen = game.ruleset.size[1]; y < ylen; y += 1) {
        var rank = (y + 1).toString();
        var cell = file + rank;
        var grid_cell = $('<div class="grid_cell grid_rank_' + rank +
            ' grid_file_' + file + '" id="' + cell + '">' + cell + '</div>')
          .appendTo(grid);
      }
    }
    ui.games.append(gamesec);
    games[game.id] = game;
  };
  var that = {};
  that.init = init;
  that.create_game = create_game;
  that.tt = tt;
  return that;
}());

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
    BSClient.tt(msg);
  });

  // Game events
  socket.on('info', function (data) {
    if (data && data.message) {
      BSClient.tt(data.message);
    }
  });

  socket.on('wait', function (data) {
    log.info('wait', data);
  });

  socket.on('engage', function (data) {
    log.info('engage', data);
    BSClient.create_game(data);
  });

  socket.on('report', function (game_id, data) {
    log.info('report', data);
  });

  socket.on('conclude', function (game_id, data) {
    log.info('conclude', data);
  });

  socket.on('connect', function () {
    $('#deploy_button').removeAttr('disabled');
    $('#enact_button').removeAttr('disabled');
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
      'six', 'seven', 'eight', 'niner', 'zero'];
    return function () {
      var l = Math.floor(Math.random() * 5) + 2;
      var m = '';
      for (var i = 0; i < l; i += 1) {
        m += phonic[Math.floor(Math.random() * phonic.length)] + ' ';
      }
      BSClient.tt(m);
      window.setTimeout(random_message, Math.floor(Math.random() * 15000) + 15000);
    };
  }());
  window.setTimeout(random_message, 30000);
  socket.emit('join');
});
