var express = require('express'),
    MemoryStore = express.session.MemoryStore,
    sessionStore = new MemoryStore(),
    connect = require('./node_modules/express/node_modules/connect'),
    Session = connect.middleware.session.Session,
    parseCookie = connect.utils.parseCookie,
    app = express.createServer(),
    io = require('socket.io'),
    sio = io.listen(app);
 
require('jade');
app.set('view engine', 'jade');
app.set('view options', {layout: false});

app.configure(function () {
    app.use(express.cookieParser());
    app.use(express.session({
        store: sessionStore,
        secret: 'secret',
        key: 'express.sid'}));
});

sio.configure(function (){
  sio.set('authorization', function (data, accept) {
      console.log("whiskey");
      var retval;
      if (data.headers.cookie) {
          console.log("tango");
          data.cookie = parseCookie(data.headers.cookie);
          data.sessionID = data.cookie['express.sid'];
          // save the session store to the data object 
          // (as required by the Session constructor)
          data.sessionStore = sessionStore;
          sessionStore.get(data.sessionID, function (err, session) {
              if (err) {
                  console.log("foxtrot");
                  retval = accept(err.message, false);
              } else {
                  console.log("!?");
                  // create a session object, passing data as request and our
                  // just acquired session data
                  data.session = new Session(data, session);
                  retval = accept(null, true);
              }
          });
      } else {
         console.log("?!");
         retval = accept('No cookie transmitted.', false);
      }
      return retval;
  });
});

sio.sockets.on('connection', function(socket){ 
  console.log('connection!');
  var hs = socket.handshake;
  socket.join(hs.sessionID);
  //check to see if there is a game that only has one player
  //if so add this player to that game
  //otherwise create a new game...and wait for another player

  //var activeClients = 0;
  //var currentGame = 1;
  //var games = new Array();

  // if (!games[currentGame]) {
  //   games[currentGame] = 'foo';
  // } else if (games[1].length == 1) {
  //   games[currentGame].push('bar');
  // } else {
  //   currentGame += 1;
  //   games[currentGame] = 'foo';
  // }

  //// activeClients +=1;
  //// socket.broadcast({clients:activeClients});
  socket.on('error', function(reason){
    console.log('unable to connect', reason);
  });

  socket.on('disconnect', function(){
    console.log('Socket ' + hs.sessionID + ' disconnected!');
  });
}); 

app.get('/public/*.(js|css)', function(req, res){
  res.sendfile("."+req.url);
});

app.get('/', function(req, res){
  console.log("who's on first?");
	res.render('sessiontest', {sess: req.sessionID});	
  console.log("what's on second?");
  sio.sockets.in(req.sessionID).send('Man, good to see you back!');
});
app.listen(3000);

//// function clientDisconnect(client){
  //// activeClients -=1;
  //// client.broadcast({clients:activeClients});
//// }
