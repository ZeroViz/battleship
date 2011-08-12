// nodejs server side requires
if (require) var log4js = require('log4js');

// allows object prototypal inheritance
if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}

var Battleship = (function () {
    
    var log = log4js ? log4js.getLogger('battleship') : null;
    
    // look up objects
    
    // gives the length and status of each ship type
    var ShipType = {
        carrier: {length: 5, status: [0,0,0,0,0]},
        battleship: {length: 4, status: [0,0,0,0]},
        destroyer: {length: 3, status: [0,0,0]},
        submerine: {length: 3, status: [0,0,0]},
        cruiser: {length: 2, status: [0,0]}
    }
    
    // holds rule requirements for each rule set
    var Ruleset = {
        normal: {size: [10,10], 
             ships:{battleship: 1,
                    carrier: 1,
                    destroyer: 1,
                    submerine: 1,
                    cruiser: 1
             },
        }
    }
    
    // holds the shot offsets for each action type
    var ActionType = {
        shot: [[0,0]]
    }

    // game object
    var Ship = {
        type: null,
        location: null,
        orientation: null,
        status: null,
        
        // sets the size of the ship acording to their type
        init_status: function (type) {
            return ShipType[type].status;
            
        },
        
        is_hit: function (location) {
            if (location === this.location) {
                return True;
            }
        },
        hit: function (location) {
            this.status[i] = 1;
        }
    }

    var Fleet = {
        ships: null
    }

    var Action = {
        id: null,
        type: '',
        location: null,
        reports: null
    }

    var Sea = {
        fleet: null,
        actions: null
    }
    
    var Report = {
        location: null,
        affect: '',
        ship: null
    }


    // game logic
    var Battle = {
        players: null,
        seas: null,
        size: null,
        ruleset: null,
        
        // creates a player id and sea for new player
        add_player: function (player_id) {
            this.players.push({ id: player_id });
            this.seas[player_id] = Object.create(Sea);
        },
        
        // deploys fleets
        do_deploy: function (player_id, fleet) {
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
        },
        
        // action prossesor
        do_enact: function (player_id, action){
            var boardsize = this.ruleset.size;
            var vaction = this.validate_action(action, boardsize);
            if (this.seas.hasOwnProperty(player_id) && vaction) {
                // genrates a report to send back to client
                var report = Object.create(Report);
                report.id = action.id;
                report.type = action.type;
                report.location = action.location;
                report.reports = [];
                
                var offsets = Object.create(ActionType)[report.type];
                // loops though offests
                for (var i=0; i < offsets.length; i++){
                    var loc = offsets[i];
                    var newLoc = [report.location[0]+loc[0], report.location[1]+loc[1]];
                    var ships = this.seas[report.id].fleet.ships;
                    var affect = 'miss';
                    for(var i2=0; i2 < ships.length; i2++){ 
                        var ship = this.get_ship_deration(ships[i2].location, ships[i2].orientation, 
                                    ShipType[ships[i2].type].length);
                        for (var len=0; len<ship.length; len++){
                            if (newLoc[0] === ship[len][0] && newLoc[1] === ship[len][1]){
                                affect = 'hit';
                                break;
                            }
                        }
                    }
                    report.reports.push({'location': newLoc, 'affect': affect, 'ship': null}) 
                }
                
                this.add_report(report);
                return report;
            }
            // if validation failes sends an error back to client
            return null;
        },
        
        add_report: function(action){
            var ships = this.seas[action.id].fleet.ships;
            for(reps in action.reports){
                if (action.reports[reps].affect === 'hit'){
                    for (var i=0; i < ships.length; i++){
                        var ship = this.get_ship_deration(ships[i].location, ships[i].orientation, 
                                    ShipType[ships[i].type].length);
          
                        for (var len=0; len<ship.length; len++){
                            if (action.reports[reps].location[0] === ship[len][0] && action.reports[reps].location[1] === ship[len][1]){
                                this.seas[action.id].fleet.ships[i].status[len] = 1;
                                break;
                            }
                        }
                    }
                }
            }
        },
        
        do_conclude: function(){
            return game;
        },
        
        validate_fleet: function (fleet, boardsize) {
            var required_ships = Ruleset[this.ruleset.type].ships
            for (var i=0; i<fleet.ships.length; i++){
                
                var vship = Object.create(Ship);
                
                vship.type = fleet.ships[i].type;
                vship.location = fleet.ships[i].location;
                vship.orientation = fleet.ships[i].orientation;
                vship.status = vship.init_status(vship.type);
                
                required_ships[vship.type] -= 1;
                
                var ship_end = this.get_ship_end(vship.location, vship.orientation, vship.status.length);
                
                //TODO replace this mess with something a little nicer
                if (ship_end === null || ship_end[0] >= boardsize[0] || ship_end[1] >= boardsize[1] 
                    || ship_end[0] < 0 || ship_end[1] < 0 || vship.location[0] >= boardsize[0] ||
                    vship.location[1] >= boardsize[1] || vship.location[0] < 0 || vship.location[1] < 0){
                    return null;
                }
                fleet.ships[i] = vship;
            }
            
            if (required_ships['carrier'] != 0 || required_ships['battleship'] != 0 ||
                required_ships['destroyer'] != 0 || required_ships['submerine'] != 0 || required_ships['cruiser'] != 0){
                return null;
            }
            return fleet;
        },
        
        validate_action: function(action, boardsize){
            if (action.type === 'shot' && this.seas.hasOwnProperty(action.id)){
                if (action.location[0] < boardsize[0] && action.location[1] < boardsize[1] 
                    && action.location[0] >= 0 && action.location[1] >= 0){
                        return action;
                }
            }
            return null;
        },
        
        get_ship_end: function(loc, ori, size) {
            var offset = null
            if (ori === 'n'){
                offset = [-size,0];
            }
            else if (ori === 's'){
                offset = [size,0];
            }
            else if (ori === 'e'){
                offset = [0,size];
            }
            else if (ori === 'w'){
                offset = [0,-size];
            }
            if (offset === null){
                return null;
            }
            return [loc[0]+offset[0], loc[1]+offset[1]];
        },

        get_ship_deration: function(coord, ori, size){
            var set = []
            
            var loc = [coord[0], coord[1]]
            set.push([loc[0], loc[1]])
            
            for (var i=0; i < size-1; i++){
                if (ori === 'n'){
                    set.push([loc[0]-=1, loc[1]])
                }
                else if (ori === 's'){
                    set.push([loc[0]+=1, loc[1]]);
                }
                else if (ori === 'e'){
                    set.push([loc[0], loc[1]+=1])
                }
                else if (ori === 'w'){
                    set.push([loc[0], loc[1]-=1]);
                }
            }
            return set
        }    
    }
    
    // creates a populated game object ready to play
    var create_game = function (game_id, players, options) {
        
        var game = Object.create(Battle);
        game.players = [];
        game.seas = {};
        
        game.id = game_id;
        game.ruleset = options.ruleset;
        game.ruleset.size = Ruleset[game.ruleset.type].size;
        game.ruleset.ships = Ruleset[game.ruleset.type].ships
        
        players.forEach(function (player) {
          game.add_player(player.id);
        });
        log && log.debug('create_game with players: %s', game.players);
        return game;
    }
    
    // public methods
    var that = {};
    that.create_game = create_game;
    that.log = log;
    //that.get_game = get_game;
    
    return that;
})();

if (module) module.exports = Battleship;
