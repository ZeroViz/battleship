// allows object prototypal inheritance
if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
}

/*global Battleship io */
var log4js = {
  getLogger: function (name) {
    var log = function (level) {
      var prefix = '[' + level.toUpperCase() + '] ' + name + ' - ';
      return function (msg) {
        if (typeof msg === 'string') {
          msg = prefix + msg;
        } else {
          msg = prefix + JSON.stringify(msg);
        }
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
  var ui_games = {};
  var my_id = null;
  // TODO replace with an array of enemy ids
  var emeny_id = null;

  var UIGame = (function () {
    var create = function (game, el, com) {
      var seas = {};
      seas[my_id] = UISea.create(game, el, com);

      var resize = function (size) {
        Object.keys(seas).forEach(function (player_id) {
          seas[player_id].resize(size);
        });
      };

      var add_actions = function (actions) {
        actions.forEach(function (action) {
          add_action(action);
        });
      };

      var add_action = function (action) {
        var sea = seas[action.id];
        // animate action
        // animate result
        action.reports.forEach(function (report) {
          switch (report.affect) {
            // notice that sunk fall through to hit so the both flag a hit
            case 'sunk':
              sea.flag_sunk(report.loc);
            case 'hit':
              sea.flag_miss(report.loc);
              break;
            case 'miss':
              sea.flag_miss(report.loc);
              break;
          }
        });
      };

      resize(ui.height);

      return {
        resize: resize,
        add_actions: add_actions
      };
    };

    return {
      create: create
    }
  }());

  var UISea = (function () {
    var seas = [];

    var create = function (game, el, com) {
      // create interface
      // cols are x
      // rows are y
      var grid = $('<div class="grid" id="' + game.id + '_grid" />');
      var grid_cells = [[], [], [], [], [], [], [], [], [], []];
      for (var x = 0, xlen = game.ruleset.size[0]; x < xlen; x += 1) {
        var file = String.fromCharCode(97 + x);
        for (var y = 0, ylen = game.ruleset.size[1]; y < ylen; y += 1) {
          var rank = (y + 1).toString();
          var cell = file + rank;
          var grid_cell = $('<div class="grid_cell grid_rank_' + rank +
            ' grid_file_' + file + '" id="' + cell + '">' + cell + '</div>')
            .appendTo(grid);
          grid_cells[x].push(grid_cell);
        }
      }
      el.append(grid);
      seas.push(grid);

      var cell_enter = function (e) {
        $(this).addClass('selected');
      };
      var cell_leave = function (e) {
        $(this).removeClass('selected');
      };
      var cell_click = function (e) {
        log.info(e.data);
        com('enact', { id: enemy_id,  type: 'shot', loc: e.data });
      };
      var resize = function (size) {
        grid.width(size).height(size);
        var cell_size = Math.floor(size / 10) - 2;
        var border_size = Math.floor((size - (cell_size + 2) * 10) / 2) + 1;
        for (var x = 0, xlen = game.ruleset.size[0]; x < xlen; x += 1) {
          for (var y = 0, ylen = game.ruleset.size[1]; y < ylen; y += 1) {
            grid_cells[x][y]
              .width(cell_size)
              .height(cell_size)
              .css('top', ((cell_size + 2) * y) + border_size)
              .css('left', ((cell_size + 2) * x) + border_size)
              .css('border-radius', Math.floor(cell_size / 4))
              .mouseenter(cell_enter)
              .mouseleave(cell_leave)
              .click([x,y],cell_click);
          }
        }
      };
      var flag_hit = function (loc) {
        grid_cells[loc[0]][loc[1]]
          .removeClass('selected')
          .addClass('hit');
        // TODO: remove mouse events
      };
      var flag_miss = function (loc) {
        grid_cells[loc[0]][loc[1]]
          .removeClass('selected')
          .addClass('miss');
        // TODO: remove mouse events
      };

      return {
        resize: resize
      };
    };

    return {
      create: create
    };
  }());

  // tab managment  
  ui.tab_list = [];
  var display_tab = function (show) {
    ui.tab_list.forEach(function (tab) {
      tab === show ? tab.show() : tab.hide();
    });
  };
  var register_tab = function (tab_name) {
    var tab = ui[tab_name + '_tab'] = $('#' + tab_name);
    ui.tab_list.push(tab);
    var button = ui[tab_name + '_button'] = $('#' + tab_name + '_button')
      .click(function () {
        display_tab(tab);
      })
      .css('cursor', 'pointer');
  };
  var add_tab = function (tab_name, tab) {
    var tab_id = tab_name.replace(/ /,'_');
    ui.buttons.append($('<li id="' + tab_id + '_button">' + tab_name + '</li>'));
    if (!tab) {
      tab = $('<section id="' + tab_id + '"><h1>' + tab_name + '</h1></section>');
    }
    ui.area.append(tab);
    register_tab(tab_id);
    return tab;
  };

  // resizing
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
    ui.height = newHeight;
    ui.width = newWidth;
    gameArea.style.marginTop = (-newHeight / 2) + 'px';
    gameArea.style.marginLeft = (-newWidth / 2) + 'px';
    gameArea.style.fontSize = (newWidth / 400) + 'em';

    Object.keys(ui_games).forEach(function (key) {
      ui_games[key].resize(newHeight);
    });
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
    ui.area = $('#area');
    ui.nav = $('#nav');
    ui.buttons = $('#buttons');
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
        var errors = games[Object.keys(games)[0]].validate_fleet(data);
        if (errors === null) {
          log.info('valid fleet');
          socket.emit('deploy', Object.keys(games)[0], data);
        } else {
          log.error('invalid fleet: ' + errors.join(', '));
        }
      } catch (err) {
        log.error('invalid deploy json ' + JSON.stringify(err));
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
    ui.make_com = function (game_id) {
      return function (event, data) {
        socket.emit(event, game_id, data);
      };
    };

    window.addEventListener('resize', resize_area, false);
    window.addEventListener('orientationchange', resize_area, false);
    resize_area();
  };
  var create_game = function (options) {
    log.debug('client create game options: ' + JSON.stringify(options));
    // create game
    var game = Battleship.create_game(options);
    games[game.id] = game;
    // create tab
    var game_section = add_tab('Game ' + game.id);
    // create game ui
    ui_games[game.id] = UIGame.create(game, game_section, ui.make_com(game.id));
    return game;
  };
  var on_wait = function (data) {
    // get own player id
    if (data && data.id) {
      my_id = data.id;
    }
  };
  var on_engage = function (game_id, data) {
    var game = create_game(data);
    // set opponent id assuming 2 players
    if (data && data.players) {
      data.players.forEach(function (player) {
        if (player.id !== my_id) {
          //TODO change this for many enemys
          enemy_id = player.id;
          ui.enact_data.val('{ "id": ' + player.id + ',\n  "type": "shot",\n  "loc": [0, 0] }');
        }
      });
    }
  };
  var on_conclude = function (game_id, data) {
    if (games[game_id]) {
      games[game_id].on_conclude(data);
    } else {
      log.error('Conclude has bad game id ' + game_id + ' with ' + JSON.stringify(data));
    }
  };
  var on_report = function (game_id, data) {
    var game = games[game_id],
        ui_game = ui_games[game_id];
    if (game) {
      game.add_actions(data);
      ui_game.add_actions(game.get_report());
    } else {
      log.error('Report has bad game id ' + game_id + ' with ' + JSON.stringify(data));
    }
  };

  // public interface
  return {
    init: init,
    tt: tt,
    on_wait: on_wait,
    on_engage: on_engage,
    on_conclude: on_conclude,
    on_report: on_report
  };
}());

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
    log.info('wait: ' + JSON.stringify(arguments));
    BSClient.on_wait(data);
  });

  socket.on('engage', function (game_id, data) {
    log.info('engage: ' + JSON.stringify(arguments));
    BSClient.on_engage(game_id, data);
  });

  socket.on('report', function (game_id, data) {
    log.info('report: ' + JSON.stringify(arguments));
    BSClient.on_report(game_id, data);
  });

  socket.on('conclude', function (game_id, data) {
    log.info('conclude: ' + JSON.stringify(arguments));
    BSClient.on_conclude(game_id, data);
  });

  socket.on('connect', function () {
    $('#deploy_button').removeAttr('disabled');
    $('#enact_button').removeAttr('disabled');
  });

  BSClient.init(socket);

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
