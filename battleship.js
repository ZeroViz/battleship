// allows object inheritance
if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}


var Battleship = (function () {

	var Ship = {
		type: '',
		location: null,
		orientation: null,
		status: [],
		
		// sets the size of the ship acording to their type
		init_status: function (type) {
			types = Object.create(Shiptype)
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
	
	var Shiptype = {
		carrier: {length: 5, status: [0,0,0,0,0]},
		battleship: {length: 4, status: [0,0,0,0]},
		destroyer: {length: 3, status: [0,0,0]},
		submerine: {length: 3, status: [0,0,0]},
		cruiser: {length: 2, status: [0,0]}
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

	var Battle = {
		players: [],
		seas: {},
		size: null,
		ruleset: null,
		add_player: function (player_id) {
			this.players.push(player_id);
			var sea = Object.create(Sea);
			this.seas[player_id] = sea;
		},
		add_player_fleet: function (player_id, fleet) {
			var boardsize = game.size;
			var vfleet = this.validate_fleet(fleet, boardsize);
			if (this.seas.hasOwnProperty(player_id) && vfleet) {
				this.seas[player_id].fleet = vfleet;
			}
		},
		validate_fleet: function (fleet, boardsize) {
			for (i=0; i<fleet.ships.length; i++){
				
				var vship = Object.create(Ship);
				
				vship.type = fleet.ships[i].type;
				vship.location = fleet.ships[i].location;
				vship.orientation = fleet.ships[i].orientation;
				vship.status = vship.init_status(vship.type);
				
				var	size = vship.status.length;
				var ship_end = game.get_ship_end(vship.location, vship.orientation, size);
				if (ship_end === null){
					return null;
				}
			}
			return fleet;
		},
		
		get_ship_end: function(loc, ori, size) {
			var offset = null
			if (ori === 'n'){
				offset = [-size,0]
			}
			else if (ori === 's'){
				offset = [size,0]
			}
			else if (ori === 'e'){
				offset = [0,size]
			}
			else if (ori === 'w'){
				offset = [0,-size]
			}
			if (offset === null){
				return null
			}
			return [loc[0]+offset[0], loc[1]+offset[1]]
		}
	}

	var next_game_id = 17;
	var games = {};

	var get_next_game_id = function () {
		return next_game_id++;
	}
	
	var create_game = function (players, options) {
		var game = Object.create(Battle);
		game.size = options.size;
		game.ruleset = options.ruleset;
		for (player in players) {
			game.add_player(players[player]);
		}
		var game_id = get_next_game_id();
		game.game_id = game_id;
		games[game_id] = game;
		return game;
	}
	
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
game.add_player_fleet('scott', {
	ships: [{type: 'carrier', location: [0,0], orientation: 's'},
	        {type: 'destroyer', location: [3,3], orientation: 'e'}]
});
game.add_player_fleet('ben', {
	ships: [{type: 'carrier', location: [0,0], orientation: 's'},
	        {type: 'destroyer', location: [3,3], orientation: 'e'}]
});

