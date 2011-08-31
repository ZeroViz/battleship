// nodejs server side requires
if (typeof require !== 'undefined') {
  var log4js = require('log4js');
}

// allows object prototypal inheritance
if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
}

// new_constructor
var new_constructor = function (extend, initializer, methods) {
  var func,
      prototype = Object.create(extend && extend.prototype);

  if (methods) {
    methods.keys().forEach(function (key) {
      prototype[key] = methods[key];
    });
  }

  func = function () {
    var that = Object.create(prototype);
    if (typeof initializer === 'function') {
      initializer.apply(that, arguments);
    }
    return that;
  };
  func.prototype = prototype;
  prototype.constructor = func;
  return func;
};

var Battleship = (function () {

  var log = log4js ? log4js.getLogger('battleship') : null;

  // holds rule requirements for each rule set
  var Ruleset = {
    normal: { name: 'normal',
              size: [10, 10],
              ships: { battleship: 1,
                       carrier: 1,
                       destroyer: 1,
                       submarine: 1,
                       cruiser: 1
                     }
            }
  };

  // holds the shot offsets for each action type
  var ActionType = {
    shot: { valid: function (action, ruleset) {
              return (action.loc &&
                      action.loc[0] >= 0 &&
                      action.loc[0] < ruleset.size[0] &&
                      action.loc[1] >= 0 &&
                      action.loc[1] < ruleset.size[1]);
            },
            offsets: [[0, 0]] }
  };

  // game object constructor function
  // will map constructor functions over lists to ensure proper deep copy
  var Ship = function (spec) {
    var ship = {};
    spec = spec || {};
    ship.type = spec.type || 'battleship';
    ship.loc = spec.loc && spec.loc.slice() || [0, 0];
    ship.ori = spec.ori || 'x';
    ship.size = Ship.size[ship.type];
    ship.status = [];
    return ship;
  };
  Ship.size = {
    carrier: 5,
    battleship: 4,
    destroyer: 3,
    submarine: 3,
    cruiser: 2
  };
  Ship.id = {
    carrier: 1,
    battleship: 2,
    destroyer: 3,
    submarine: 4,
    cruiser: 5
  };

  var Fleet = function (spec) {
    var fleet = {};
    spec = spec || {};
    fleet.ships = spec.ships && spec.ships.map(Ship) || [];
    return fleet;
  };

  var Report = function (spec) {
    var report = {};
    spec = spec || {};
    report.loc = spec.loc && spec.loc.slice() || [0, 0];
    report.affect = spec.affect || null;
    // optional properties
    if (spec.ship) {
      report.ship = Ship(spec.ship);
    }
    return report;
  };

  var Action = function (spec) {
    var action = {};
    spec = spec || {};
    action.id = spec.id || null;
    action.type = spec.type || 'shot';
    action.loc = spec.loc && spec.loc.slice() || [0, 0];
    action.reports = spec.reports && spec.reports.map(Report) || [];
    return action;
  };

  var Sea = function (spec) {
    var sea = {};
    spec = spec || {};
    sea.fleet = Fleet(spec.fleet) || null;
    sea.actions = spec.actions && spec.sctions.map(Action) || [];
    return sea;
  };

  // game logic
  var Battle = function (spec) {
    var battle = {};
    var turn = 0;
    var turn_actions;

    spec = spec || {};
    battle.players = spec.players && spec.players.slice() || [];
    battle.seas = {};
    if (spec.seas) {
      Object.keys(spec.seas).forEach(function (player_id) {
        battle.seas[player_id] = spec.seas[player_id];
      });
    }
    battle.size = spec.size || [10, 10];
    battle.ruleset = spec.ruleset || Ruleset.normal;

    // creates a player id and sea for new player
    battle.add_player = function (player_id) {
      this.players.push({ id: player_id });
      this.seas[player_id] = Sea();
    };

    battle.print = function () {
      // get print output for each sea
      // display side by side on console
      var outputs = [],
          lengths = [];
      battle.players.forEach(function (player, p) {
        var lines = battle.sea_string(player.id).split(/\n/);
        lines.forEach(function (line, i) {
          // add blank line if previous sea has less lines than current
          if (!outputs[i]) {
            outputs.push([]);
            for (var x = 0; x < p; x += 1) {
              outputs[i].push('');
            }
          }
          // look for max length of lines
          outputs[i].push(line);
          if (!lengths[i]) lengths.push(0);
          lengths[i] = Math.max(lengths[i], line.length);
        });
      });
      var max_len = Math.max(lengths);
      // build nth line for each player with padding
      var pad = function (text, len, c) {
        for (var p = text.length; p < len; p += 1) {
          text += c;
        }
        return text;
      };
      return '\n' + outputs.map(function (lines) {
        return lines.map(function (line) {
          return pad(line, max_len, ' ');
        }).join(' ');
      }).join('\n');
    };

    battle.sea_string = function (player_id) {
      if (battle.seas[player_id]) {
        // build initialized grid
        var sea = battle.seas[player_id],
          grid = [],
          x, y;
        for (y = 0; y < battle.size[0]; y += 1) {
          var row = [];
          for (x = 0; x < battle.size[1]; x += 1) {
            row.push(0);
          }
          grid.push(row);
        }
        // add ships
        if (sea.fleet && sea.fleet.ships) {
          sea.fleet.ships.forEach(function (ship, idx) {
            var locs = battle.get_ship_locs(ship);
            for (var i = 0; i < locs.length; i += 1) {
              grid[locs[i][0]][locs[i][1]] = Ship.id[ship.type];
              if (ship.status[i] === 1) {
                grid[locs[i][0]][locs[i][1]] += 5;
              }
            }
          });
        }
        // add misses
        if (sea.actions) {
          sea.actions.forEach(function (action) {
            if (action.reports) {
              action.reports.forEach(function (report) {
                if (report.affect && report.affect == 'miss' && report.loc) {
                  grid[report.loc[0]][report.loc[1]] = 11;
                }
              });
            }
          });
        }
        var s = '+--player ' + player_id + '-----------+\n',
          sym = ['.',                     // water
                 'a', 'b', 'd', 's', 'c', // ship
                 'A', 'B', 'D', 'S', 'C', // hit ship
                 '+',                     // miss
                 '|', '|\n', ' '];             // begin row, end row, between columns
        for (y = 0; y < battle.size[0]; y += 1) {
          s += sym[12];
          s += sym[14];
          for (x = 0; x < battle.size[1]; x += 1) {
            s += sym[grid[x][y]];
            s += sym[14];
          }
          s += sym[13];
        }
        s += '+---------------------+\n';
        return s;
      } else {
        return '';
      }
    };

    battle.process_moves = function (moves) {
      // TODO: process moves
      var results = {};
      log.debug('processing moves for players ' + JSON.stringify(battle.players));
      battle.players.forEach(function (player) {
        log.debug('player ' + player.id);
        if (moves[player.id]) {
          moves[player.id].forEach(function (move) {
            log.debug('... has move: ' + JSON.stringify(move));
            battle.do_move.apply(battle, move);
          });
        }
      });
      battle.players.forEach(function (player) {
        results[player.id] = ['report', battle.get_report(player.id)];
      });
      return results;
    };

    battle.do_move = function (player_id, event, data) {
      switch (event) {
      case 'deploy':
        return battle.do_deploy(player_id, data);
      case 'enact':
        return battle.do_enact(player_id, data);
      }
      return null;
    };

    battle.start_game = function () {
    };

    battle.start_turn = function () {
      turn += 1;
      turn_actions = [];
    };

    battle.game_over = function () {
      return false;
    };

    battle.get_report = function (player_id) {
      // all players receive the same info for now
      return turn_actions;
    };

    // deploys fleets
    battle.do_deploy = function (player_id, fleet) {
      fleet = Fleet(fleet); // normalize fleet object
      if (this.seas[player_id] &&
          this.validate_fleet(fleet, this.ruleset)) {
        // adds modified and validated fleet to the players fleet
        // and returns the updated fleet to client
        this.seas[player_id].fleet = fleet;
        return fleet;
      }
      // if validation fails sends an error back to client
      return null;
    };

    battle.add_fleet = function (player_id, fleet) {
      this.seas[player_id].fleet = fleet;
    };

    // action prossesor
    battle.do_enact = function (player_id, action) {
      action = Action(action); // normalize action object
      var i, i2, len;
      if (this.seas[player_id] &&
          this.validate_action(action, this.ruleset)) {
        var offsets = ActionType[action.type].offsets;
        // loops though offsets
        for (i = 0; i < offsets.length; i += 1) {
          var loc = offsets[i];
          var newLoc = [action.loc[0] + loc[0], action.loc[1] + loc[1]];
          var ships = this.seas[action.id].fleet.ships;
          var affect = 'miss';
          for (i2 = 0; i2 < ships.length; i2 += 1) {
            var ship = this.get_ship_locs(ships[i2]);
            for (len = 0; len < ship.length; len += 1) {
              if (newLoc[0] === ship[len][0] && newLoc[1] === ship[len][1]) {
                affect = 'hit';
                log.info('player ' + player_id + ' hit at ' + newLoc);
                break;
              }
            }
          }
          action.reports.push(Report({
            'loc': newLoc,
            'affect': affect
          }));
        }

        this.add_action(action);
        return action;
      }
      // if validation failes sends an error back to client
      return null;
    };

    battle.validate_fleet = function (fleet, boardsize) {
      var i;
      var rs = Ruleset[this.ruleset.name].ships;
      var required_ships = {};
      for (i = 0; i < fleet.ships.length; i += 1) {
        var vship = Ship({
          type: fleet.ships[i].type,
          loc: fleet.ships[i].loc,
          ori: fleet.ships[i].ori
        });

        vship.status = [];
        for (var s = 0; s < Ship.size[vship.type]; s += 1) {
          vship.status.push(0);
        }

        required_ships[vship.type] = rs[vship.type] - 1;

        var ship_end = this.get_ship_end(vship);

        //TODO replace this mess with something a little nicer
        if (ship_end === null || ship_end[0] >= boardsize[0] || ship_end[1] >= boardsize[1] ||
            ship_end[0] < 0 || ship_end[1] < 0 || vship.loc[0] >= boardsize[0] ||
            vship.loc[1] >= boardsize[1] || vship.loc[0] < 0 || vship.loc[1] < 0) {
          log.debug('ship not valid');
          return null;
        }
        fleet.ships[i] = vship;
      }

      if (required_ships.carrier !== 0 ||
          required_ships.battleship !== 0 ||
          required_ships.destroyer !== 0 ||
          required_ships.submarine !== 0 ||
          required_ships.cruiser !== 0) {
        log.debug('ship not valid');
        return null;
      }
      return fleet;
    };

    battle.add_action = function (action) {
      var ships = this.seas[action.id].fleet.ships;
      for (var r = 0, rlen = action.reports.length; r < rlen; r += 1) {
        var report = action.reports[r];
        var i, len;
        if (report.affect === 'hit') {
          for (i = 0; i < ships.length; i += 1) {
            var ship = ships[i];
            var locs = battle.get_ship_locs(ships[i]);
            for (len = 0; len < locs.length; len += 1) {
              if (report.loc[0] === locs[len][0] &&
                  report.loc[1] === locs[len][1]) {
                ship.status[len] = 1;
                // check for sunk ship
                var sunk = true;
                for (var s = 0, slen = ship.status.length; s < slen; s += 1) {
                  if (ship.status[s] === 0) {
                    sunk = false;
                    break;
                  }
                }
                if (sunk) {
                  log.info('player ' + action.id + '\'s ship is sunk');
                  report.affect = 'sunk';
                  report.ship = { type: ship.type };
                }
                break;
              }
            }
          }
        }
      }
      this.seas[action.id].actions.push(action);
      log.debug('adding action to turn actions: ' + JSON.stringify(action));
      turn_actions.push(action);
    };

    battle.add_actions = function (actions) {
      actions.forEach(battle.add_action);
    };

    battle.validate_action = function (action, ruleset) {
      if (action.id &&
          this.seas.hasOwnProperty(action.id) &&
          action.type &&
          ActionType[action.type] &&
          ActionType[action.type].valid(action, ruleset)) {
        return action;
      }
      log.warn('invalid action, must contain type and id');
      return null;
    };

    battle.get_ship_end = function (ship) {
      switch (ship.ori) {
      case 'n':
        return [ship.loc[0] - ship.size, ship.loc[1]];
      case 's':
        return [ship.loc[0] + ship.size, ship.loc[1]];
      case 'e':
        return [ship.loc[0], ship.loc[1] + ship.size];
      case 'w':
        return [ship.loc[0], ship.loc[1] - ship.size];
      }
    };

    battle.get_ship_locs = function (ship) {
      var locs = [],
        x = ship.loc[0],
        y = ship.loc[1],
        i;
      for (i = 0; i < ship.size; i += 1) {
        locs.push([x, y]);
        switch (ship.ori) {
        case 'n':
          y -= 1;
          break;
        case 's':
          y += 1;
          break;
        case 'e':
          x += 1;
          break;
        case 'w':
          x -= 1;
          break;
        }
      }
      return locs;
    };

    return battle;
  };

  // creates a populated game object ready to play
  var create_game = function (options) {
    if (typeof options !== 'object' || typeof options.players !== 'object') {
      throw { name: 'BattleshipCreateGameError',
              message: 'must include array of players' };
    }
    var game = Battle();

    game.id = options.id || 0;
    game.ruleset = Ruleset[options.ruleset] || Ruleset.normal;
    game.capacity = options.players.length;

    options.players.forEach(function (player) {
      if (typeof player === 'number') {
        player = { id: player };
      }
      game.add_player(player.id);
    });
    log && log.debug('create_game with players: %s', game.players);
    return game;
  };

  // public methods
  var that = {};
  that.create_game = create_game;
  that.Ruleset = Ruleset;
  that.log = log;
  //that.get_game = get_game;

  return that;
}());

if (typeof exports !== 'undefined') {
  module.exports = Battleship;
}
