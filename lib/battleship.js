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

    // look up objects

    // gives the length and status of each ship type
  ShipType = {
    carrier: {length: 5, status: [0, 0, 0, 0, 0]},
    battleship: {length: 4, status: [0, 0, 0, 0]},
    destroyer: {length: 3, status: [0, 0, 0]},
    submarine: {length: 3, status: [0, 0, 0]},
    cruiser: {length: 2, status: [0, 0]}
  }

    // holds rule requirements for each rule set
  Ruleset = {
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
    shot: [[0, 0]]
  };

  // game object constructor function
  // will map constructor functions over lists to ensure proper deep copy
  var Ship = function (spec) {
    var ship = {};
    spec = spec || {};
    ship.type = spec.type || 'battleship';
    ship.loc = spec.loc || [0, 0];
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

  var Fleet = function (spec) {
    var fleet = {};
    spec = spec || {};
    fleet.ships = spec.ships || [];
    fleet.ships = fleet.ships.map(Ship)
    return fleet;
  };

  var Action = function (spec) {
    var action = {};
    spec = spec || {};
    action.id = spec.id || null;
    action.type = spec.type || 'shot';
    action.loc = spec.loc || [0, 0];
    action.reports = spec.reports || [];
    action.reports = action.reports.map(Report);
    return action;
  };

  var Sea = function (spec) {
    var sea = {};
    spec = spec || {};
    sea.fleet = Fleet(spec.fleet) || null;
    sea.actions = spec.actions || [];
    sea.actions = sea.actions.map(Action);
    return sea;
  };

  var Report = function (spec) {
    var report = {};
    spec = spec || {};
    report.loc = spec.loc || [0, 0];
    report.affect = spec.affect || null;
    // optional properties
    if (spec.ship) {
      report.ship = Ship(spec.ship);
    }
    return report;
  };

  // game logic
  var Battle = function (spec) {
    var battle = {};
    spec = spec || {};
    battle.players = spec.players || [];
    battle.seas = {};
    if (spec.seas) {
      spec.seas.keys.forEach(function (player_id) {
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

    battle.process_moves = function (callback) {
      // TODO: process moves
      var results = {};
      battle.players.forEach(function (player) {
        result[player.id]

    battle.do_move = function (player_id, event, data) {
      switch (event) {
      case 'deploy':
        battle.do_deploy(player_id, data);
        break;
      case 'enact':
        battle.do_enact(player_id, data);
        break;
      };
    };

    // deploys fleets
    battle.do_deploy = function (player_id, fleet) {
      var boardsize = this.ruleset.size;
      var vfleet = this.validate_fleet(fleet, boardsize);
      if (this.seas.hasOwnProperty(player_id) && vfleet) {
        // addes modified and validated fleet to the players fleet
        // and returns the updated fleet to client
        this.seas[player_id].fleet = vfleet;

        return vfleet;
      }
      // if validation failes sends an error back to client
      return null;
    };

    // action prossesor
    battle.do_enact = function (player_id, action) {
      var boardsize = this.ruleset.size;
      var vaction = this.validate_action(action, boardsize);
      var i, i2, len;
      if (this.seas.hasOwnProperty(player_id) && vaction) {
        // genrates a report to send back to client
        var report = Object.create(Report);
        report.id = action.id;
        report.type = action.type;
        report.location = action.location;
        report.reports = [];

        var offsets = Object.create(ActionType)[report.type];
        // loops though offsets
        for (i = 0; i < offsets.length; i += 1) {
          var loc = offsets[i];
          var newLoc = [report.location[0] + loc[0], report.location[1] + loc[1]];
          var ships = this.seas[report.id].fleet.ships;
          var affect = 'miss';
          for (i2 = 0; i2 < ships.length; i2 += 1) {
            var ship = this.get_ship_deration(ships[i2].location, ships[i2].orientation,
                ShipType[ships[i2].type].length);
            for (len = 0; len < ship.length; len += 1) {
              if (newLoc[0] === ship[len][0] && newLoc[1] === ship[len][1]) {
                affect = 'hit';
                break;
              }
            }
          }
          report.reports.push({'location': newLoc, 'affect': affect, 'ship': null});
        }

        this.add_report(report);
        return report;
      }
      // if validation failes sends an error back to client
      return null;
    };

    battle.add_report = function (action) {
      var ships = this.seas[action.id].fleet.ships;
      action.reports.forEach(function (reps) {
        var i, len;
        if (action.reports[reps].affect === 'hit') {
          for (i = 0; i < ships.length; i += 1) {
            var ship = this.get_ship_deration(ships[i].location, ships[i].orientation,
              ShipType[ships[i].type].length);
            for (len = 0; len < ship.length; len += 1) {
              if (action.reports[reps].location[0] === ship[len][0] &&
                  action.reports[reps].location[1] === ship[len][1]) {
                this.seas[action.id].fleet.ships[i].status[len] = 1;
                break;
              }
            }
          }
        }
      });
    };

    battle.validate_fleet = function (fleet, boardsize) {
      var required_ships = Ruleset[this.ruleset.type].ships;
      var i;
      for (i = 0; i < fleet.ships.length; i += 1) {

        var vship = Object.create(Ship);

        vship.type = fleet.ships[i].type;
        vship.location = fleet.ships[i].location;
        vship.orientation = fleet.ships[i].orientation;
        vship.status = vship.init_status(vship.type);

        required_ships[vship.type] -= 1;

        var ship_end = this.get_ship_end(vship.location, vship.orientation, vship.status.length);

        //TODO replace this mess with something a little nicer
        if (ship_end === null || ship_end[0] >= boardsize[0] || ship_end[1] >= boardsize[1] ||
            ship_end[0] < 0 || ship_end[1] < 0 || vship.location[0] >= boardsize[0] ||
            vship.location[1] >= boardsize[1] || vship.location[0] < 0 || vship.location[1] < 0) {
          return null;
        }
        fleet.ships[i] = vship;
      }

      if (required_ships.carrier !== 0 ||
          required_ships.battleship !== 0 ||
          required_ships.destroyer !== 0 ||
          required_ships.submarine !== 0 ||
          required_ships.cruiser !== 0) {
        return null;
      }
      return fleet;
    };

    battle.validate_action = function (action, boardsize) {
      if (action.type === 'shot' && this.seas.hasOwnProperty(action.id)) {
        if (action.location[0] < boardsize[0] &&
            action.location[1] < boardsize[1] &&
            action.location[0] >= 0 &&
            action.location[1] >= 0) {
          return action;
        }
      }
      return null;
    };

    battle.get_ship_end = function (loc, ori, size) {
      switch (ori) {
      case 'n':
        return [loc[0] - size, loc[1]];
      case 's':
        return [loc[0] + size, loc[1]];
      case 'e':
        return [loc[0], loc[1] + size];
      case 'w':
        return [loc[0], loc[1] - size];
      }
    };

    battle.get_ship_deration = function (loc, ori, size) {
      var locs = [],
        x = loc[0],
        y = loc[1],
        i;
      for (i = 0; i < size; i += 1) {
        switch (ori) {
        case 'n':
          locs.push([x, y]);
          y -= 1;
          break;
        case 's':
          locs.push([x, y]);
          y += 1;
          break;
        case 'e':
          locs.push([x, y]);
          x += 1;
          break;
        case 'w':
          locs.push([x, y]);
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
