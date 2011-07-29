// ship objects
function aircraftCarrier(loc, orientation){
	this.type = 'Aircraft Carrier';
	this.stat = [0,0,0,0,0];
	this.loc = loc;
	this.orientation = orientation;
}

function battleship(loc, orientation){
	this.type = 'Battleship';
	this.stat = [0,0,0,0];
	this.loc = loc;
	this.orientation = orientation;
}

function destroyer(loc, orientation){
	this.type = 'Destroyer';
	this.stat = [0,0,0];
	this.loc = loc;
	this.orientation = orientation;
}

function sub(loc, orientation){
	this.type = 'Submarine';
	this.stat = [0,0,0];
	this.loc = loc;
	this.orientation = orientation;
}

function cruiser(loc, orientation){
	this.type = 'Cruiser';
	this.stat = [0,0];
	this.loc = loc;
	this.orientation = orientation;
}

// fleet object
function fleet(){
	this.ships = [new aircraftCarrier([], ''), new battleship([], ''), new destroyer([], ''), new sub([], ''), new cruiser([], '')];
}


//action objects
function shot(cordinance){
	this.type = 'shot';
	this.cordinance = cordinance;
}


// sea object
/* still needs infromation */
function sea(fleetObj){
	this.actions = [];
	this.fleet = fleetObj;
}


// battle object
function battle(){
	this.players = [];
	this.seas = [];
}	


// report object
function report(){
	this.report	= [];
	this.actions = [];
}