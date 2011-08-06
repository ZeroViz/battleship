// allows object prototypal inheritance
if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}


var Battleship = (function () {
    
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
        type: ''
    }

    var Sea = {
        fleet: null,
        actions: [],
    }


    // game logic
    var Battle = {
        players: [],
        seas: {},
        size: null,
        ruleset: null,
        
        // creates a player id and sea for new player
        join: function (player_id) {
            this.players.push(player_id);
            var sea = Object.create(Sea);
            this.seas[player_id] = sea;
        },
        
        // deploys fleets
        deploy: function (player_id, fleet) {
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
        enact: function (player_id, action){
            var boardsize = game.size;
            var vaction = this.validate_action(action, boardsize);
            if (this.seas.hasOwnProperty(player_id) && vaction) {
                // genrates a report to send back to client
                var report = this.create_report(vaction);
                return report;
            }
            // if validation failes sends an error back to client
            return null;
        },
        
        create_report: function(action){
            
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
        }
    }


    //TODO replace with server genrated id
    var next_game_id = 17;
    var games = {};

    var get_next_game_id = function () {
        return next_game_id++;
    }
    
    // creates a populated game object ready to play
    var create_game = function (players, options) {
        
        var game = Object.create(Battle);
        var rs = Object.create(Ruleset);
        
        game.ruleset = options.ruleset;
        game.size = rs[game.ruleset].size;
        
        for (player in players) {
            game.join(players[player]);
        }
        
        //TODO replace with server genrated id
        var game_id = get_next_game_id();
        game.game_id = game_id;
        games[game_id] = game;
        return game;
    }
    
    // i don't think we will need this
    var get_game = function (game_id) {
        return games[game_id];
    }
    
    // public methods
    var that = {};
    that.create_game = create_game;
    that.get_game = get_game;
    
    return that;
})();

// node js server example
var game = Battleship.create_game(['scott', 'ben'],
            {
                ruleset: 'normal',
                size: [10,10]
            })
game.deploy('scott', {
    ships: [{type: 'carrier', location: [0,0], orientation: 's'},
            {type: 'destroyer', location: [3,3], orientation: 'e'}]
});
game.deploy('ben', {
    ships: [{type: 'carrier', location: [0,0], orientation: 's'},
            {type: 'destroyer', location: [3,3], orientation: 'e'}]
});

game.enact('scott', {id: 'ben', type: 'shot', location: [0,2]});
