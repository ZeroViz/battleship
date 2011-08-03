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
		init_status: function () {
			if (this.type === 'carrier') {
				this.status = [0,0,0,0,0]
			}
			else if (this.type === 'battleship') {
				this.status = [0,0,0,0]
			}
			else if (this.type === 'destroyer' || this.type === 'submerine') {
				this.status = [0,0,0]
			}
			else if (this.type === 'cruiser') {
				this.status = [0,0]
			}
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
			if (this.seas.hasOwnProperty(player_id) && this.validate_fleet(fleet, boardsize)) {
				this.seas[player_id].fleet = fleet;
			}
		},
		validate_fleet: function (fleet, boardsize) {
			for (i=0; i<=fleet.ships.length; i++){
				
				var vship = Object.create(Ship);
				
				vship.type = fleet.ships[i].type;
				vship.location = fleet.ships[i].location;
				vship.orientation = fleet.ships[i].orientation;
				vship.init_status();
				
				var size = vship.status.length;
				var ship_end = game.get_ship_end(fleet.ship[i].location, fleet.ships[i].orientation, size);
				}
			return fleet;
			// fails
			return null;
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
