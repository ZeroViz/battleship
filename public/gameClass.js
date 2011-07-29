function newGame(){
	this.UNSEEN = 0;
	this.HIT = -1;
	this.MISS = -2;
	
	this.boards = {};
	
	this.fire_shot = function(actionObj){
		//send stuff to the server
	}
	
	this.update_seas = function(reportObj){
		// get stuff from server
	}
	
	this.send_fleet = function(fleetObj){
		Game.my_fleet = fleetObj;
		// sends fleet information after placement
	}
}