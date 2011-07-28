function newGame(gameID){
	window['game'+gameID] = new Object;
	//set up game boards
	for (i=0; i<10; i++){
		window['game'+gameID].p1board[i] = [];
		window['game'+gameID].p2board[i] = [];
	}
	window['game'+gameID].shoot = function(inpt){
		return "you fired at "+ inpt +" and the result is being pushed to both players";
	}
}

function shoot(gameID, location){
        window['game'+gameID].shoot(location);
}

