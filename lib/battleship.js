// nodejs server side requires
if (typeof require !== 'undefined') {
  var log4js = require('log4js');
}

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

    // copy data from spec
    spec = spec || {};

    battle.id = spec.id || 1;

    battle.players = spec.players && spec.players.map(function (player) {
      if (typeof player === 'number') {
        return { id: player };
      } else {
        return { id: player.id };
      }
    }) || [];

    battle.seas = {};
    if (spec.seas) {
      Object.keys(spec.seas).forEach(function (player_id) {
        battle.seas[player_id] = spec.seas[player_id];
      });
    }
    battle.players.forEach(function (player) {
      if (!battle.seas[player.id]) {
        battle.seas[player.id] = Sea();
      }
    });

    battle.ruleset = spec.ruleset || Ruleset.normal;
    if (typeof battle.ruleset === 'string') {
      battle.ruleset = Ruleset.normal;
    }
    battle.size = spec.size || battle.ruleset.size;

    // creates a player id and sea for new player
    battle.add_player = function (player) {
      if (typeof player === 'number') {
        player = { id: player };
      }
      battle.players.push({ id: player.id });
      battle.seas[player.id] = Sea();
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
      if (battle.seas[player_id]) {
        var errors = battle.validate_fleet(fleet, battle.ruleset);
        if (errors === null) {
            battle.add_fleet(player_id, fleet);
        }
        return errors;
      } else {
          return ['player ' + player_id + ' not in game'];
      }
    };
    
    battle.validate_fleet = function (fleet) {
      var errors = [];
      var i;
      var required_ships = {};
      Object.keys(battle.ruleset.ships).forEach(function (type) {
        required_ships[type] = battle.ruleset.ships[type];
      });
      
      if (!fleet.ships) {
        errors.push('no ships array');
      } else {
        var used = [];
        fleet.ships.forEach(function (ship) {
          if (ship.type && ship.loc && ship.ori) {
            var v_ship = Ship(ship);

            if (required_ships[v_ship.type]) {
              if (required_ships[v_ship.type] > 0) {
                required_ships[v_ship.type] -= 1;
              } else {
                errors.push('ship is extra: ' + JSON.stringify(v_ship));
              }
            } else {
              errors.push('ship type ' + v_ship.type + ' is not required');  
            }

            var ship_end = battle.get_ship_end(v_ship);

            if (ship_end === null || ship_end[0] >= battle.ruleset.size[0] || ship_end[1] >= battle.ruleset.size[1] ||
                ship_end[0] < 0 || ship_end[1] < 0 || v_ship.loc[0] >= battle.ruleset.size[0] ||
                v_ship.loc[1] >= battle.ruleset.size[1] || v_ship.loc[0] < 0 || v_ship.loc[1] < 0) {
              errors.push('ship ' + JSON.stringify(v_ship) + 'exceeds the bounds of the game board');
            }
            
            var ship_used = battle.get_ship_locs(v_ship);
            ship_used.forEach(function(point){
              used.forEach(function(point2){
                if (point[0] === point2[0] && point[1] === point2[1]){
                  errors.push('position ' + point + ' is overlapping');
                }
              });
              used.push(point);
            });
          } else {
            errors.push('ship is invalid: ' + JSON.stringify(ship));
          }
        });
      }

      if (required_ships.carrier !== 0 ||
          required_ships.battleship !== 0 ||
          required_ships.destroyer !== 0 ||
          required_ships.submarine !== 0 ||
          required_ships.cruiser !== 0) {
        errors.push('the required number of ships have not been meet ' +
            JSON.stringify(required_ships));
      }
      return errors.length > 0 ? errors : null;
    };
    
    battle.add_fleet = function (player_id, fleet) {
      battle.seas[player_id].fleet = Fleet(fleet);
    };

    // action prossesor
    battle.do_enact = function (player_id, action) {
      if (battle.seas[player_id]){
        var errors = battle.validate_action(action, battle.ruleset)
        if (errors === null){
          return battle.add_action(action);
        }
        return errors;
      } else {
       return ['player ' + player_id + 'not in game'];
      }
    };
    
    battle.validate_action = function (action) {
      if (action.id &&
          battle.seas.hasOwnProperty(action.id) &&
          action.type &&
          ActionType[action.type] &&
          ActionType[action.type].valid(action, battle.ruleset)) {
        return null;
      }
      return ['action ' + action + ' has an invalid action or id'];
    };

    battle.add_action = function (action) {
      action = Action(action); // normalize action object
      // determines hit or miss
      var i, i2, len;
      var ship_affects = [];
      var offsets = ActionType[action.type].offsets;
      var ships = battle.seas[action.id].fleet.ships;
      for (i = 0; i < offsets.length; i += 1) {
        var loc = offsets[i];
        var newLoc = [action.loc[0] + loc[0], action.loc[1] + loc[1]];
        var affect = 'miss';
        for (i2 = 0; i2 < ships.length; i2 += 1) {
          var ship = ships[i2];
          var ship_locs = battle.get_ship_locs(ships[i2]);
          var sunk = true;
          for (len = 0; len < ship_locs.length; len += 1) {
            if (newLoc[0] === ship_locs[len][0] && newLoc[1] === ship_locs[len][1]) {
              affect = 'hit';
              // set ship status
              ship.status[len] = 1;
            }
            if (!ship.status[len]) {
              sunk = false;
            }
          }
          if (affect === 'hit') {
            // add report to action
            if (sunk) {
              action.reports.push({affect: 'sunk', loc: newLoc, ship: {type: ship.type}});
            } else {
              action.reports.push({affect: affect, loc: newLoc});
            }
            // stop looking at ships if we have a hit
            break;
          }
        }
        if (affect === 'miss'){
          action.reports.push({affect: 'miss', shot_loc: newLoc});
        }
      }
      
      battle.seas[action.id].actions.push(action);
      turn_actions.push(action);
      return action;
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

    battle.add_actions = function (actions) {
      actions.forEach(battle.add_action);
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
    var game = Battle(options);

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
