// allows object prototypal inheritance
if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}

var Battleship = (function () {
    
    var log = null;
    
    if (log) log.debug('');
    
    // look up objects
    var ShipType = {
        carrier: {length: 5, status: [0,0,0,0,0]},
        battleship: {length: 4, status: [0,0,0,0]},
        destroyer: {length: 3, status: [0,0,0]},
        submerine: {length: 3, status: [0,0,0]},
        cruiser: {length: 2, status: [0,0]}
    }
    
    var Ruleset = {
        normal: {size: [10,10]}
    }
    
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
            types = Object.create(ShipType);
            return types[type].status;
            
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
        ships: []
    }

    var Action = {
        id: null,
        type: '',
        location: [],
        reports: []
    }

    var Sea = {
        fleet: null,
        actions: []
    }
    
    var Report = {
        location: [],
        affect: '',
        ship: null
    }


    // game logic
    var Battle = {
        players: [],
        seas: {},
        size: null,
        ruleset: null,
        
        // creates a player id and sea for new player
        add_player: function (player_id) {
            this.players.push(player_id);
            var sea = Object.create(Sea);
            this.seas[player_id] = sea;
        },
        
        // deploys fleets
        do_deploy: function (player_id, fleet) {
            var boardsize = game.size;
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
            var boardsize = game.size;
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
                for (i=0; i < offsets.length; i++){
                    var loc = offsets[i];
                    var newLoc = [report.location[0]+loc[0], report.location[1]+loc[1]];
                    var ships = this.seas[report.id].fleet.ships;
                    var affect = 'miss';
                    for(inc=0; inc < ships.length; inc++){ 
                        var ship = this.get_ship_deration(ships[inc].location, ships[inc].orientation, 
                                    Object.create(ShipType)[ships[inc].type].length);
                        //DEBUG somethings not right here
                        for (l in ship){
                            if (newLoc === ship[l]){
                                affect = 'hit'
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
            // updates game state
        },
        
        validate_fleet: function (fleet, boardsize) {
            for (i=0; i<fleet.ships.length; i++){
                
                var vship = Object.create(Ship);
                
                vship.type = fleet.ships[i].type;
                vship.location = fleet.ships[i].location;
                vship.orientation = fleet.ships[i].orientation;
                vship.status = vship.init_status(vship.type);
                
                var    size = vship.status.length;
                var ship_end = game.get_ship_end(vship.location, vship.orientation, size);
                
                //TODO replace this mess with something a little nicer
                if (ship_end === null || ship_end[0] >= boardsize[0] || ship_end[1] >= boardsize[1] 
                    || ship_end[0] < 0 || ship_end[1] < 0 || vship.location[0] >= boardsize[0] ||
                    vship.location[1] >= boardsize[1] || vship.location[0] < 0 || vship.location[1] < 0){
                    return null;
                }
                fleet.ships[i] = vship;
            }
            return fleet;
        },
        
        validate_action: function(action, boardsize){
            if (action.type === 'shot' && game.seas.hasOwnProperty(action.id)){
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

        get_ship_deration: function(loc, ori, size){
            var set = []
            for (i=0; i < size; i++){
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
    /*
    var next_game_id = 17;
    var games = {};

    var get_next_game_id = function () {
        return next_game_id++;
    }
    */
    
    // creates a populated game object ready to play
    var create_game = function (game_id, players, options) {
        
        var game = Object.create(Battle);
        
        game.ruleset = options.ruleset;
        game.size = Object.create(Ruleset)[game.ruleset].size;
        
        for (player in players) {
            game.add_player(players[player]);
        }
        return game;
        
    }   
    /*    
        var game_id = get_next_game_id();
        game.game_id = game_id;
        games[game_id] = game;
        return game;
    }
    
    var get_game = function (game_id) {
        return games[game_id];
    }
    */
    
    // public methods
    var that = {};
    that.create_game = create_game;
    //that.get_game = get_game;
    
    return that;
})();

// node js server example
var game = Battleship.create_game(17, ['scott', 'ben'],
            {
                ruleset: 'normal',
                size: [10,10]
            });
game.do_deploy('scott', {
    ships: [{type: 'carrier', location: [0,0], orientation: 's'},
            {type: 'destroyer', location: [3,3], orientation: 'e'}]
});
game.do_deploy('ben', {
    ships: [{type: 'carrier', location: [0,0], orientation: 's'},
            {type: 'destroyer', location: [3,3], orientation: 'e'}]
});

game.do_enact('scott', {id: 'ben', type: 'shot', location: [0,2]});
