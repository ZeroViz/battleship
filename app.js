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
app.set('view options', {layout: true});

app.configure(function () {
    app.use(express.cookieParser());
    app.use(express.session({
        store: sessionStore,
        secret: 'secret',
        key: 'express.sid'}));
});

var games = [];
function joinGame(player){
    // add the player to an existing game or create 
    // a new game then return the index of the game  
    var i, joined = false;
    for (i=0; i < games.length; i++){
        if (games[i].length == 1){
            games[i].push(player);
            joined = true;
            break;
        };
    };
    if (!(joined)){
        games.push([player]);
    }
    return i;
};

sio.configure(function (){
  sio.set('authorization', function (data, accept) {
      var result;
      if (data.headers.cookie) {
          data.cookie = parseCookie(data.headers.cookie);
          data.sessionID = data.cookie['express.sid'];
          data.gameID = joinGame(data.sessionID);
          // save the session store to the data object 
          // (as required by the Session constructor)
          data.sessionStore = sessionStore;
          sessionStore.get(data.sessionID, function (err, session) {
              if (err) {
                  result = accept(err.message, false);
              } else {
                  // create a session object, passing data as request and our
                  // just acquired session data
                  data.session = new Session(data, session);
                  result = accept(null, true);
              }
          });
      } else {
          result = accept('No cookie transmitted.', false);
      }
      return result;
  });
});

sio.sockets.on('connection', function(socket) {
    var hs = socket.handshake;

    var op = games[hs.gameID].filter(function(e){
        var result;                                   
        if (e!==hs.sessionID) {e = result;}
        return result;
    }).join(",");

    socket.join(hs.gameID);
  
    sio.sockets.in(hs.gameID).send({challenger:op});

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
    res.render('game', {sess: req.sessionID});
    //sio.sockets.in(req.sessionID).send('Man, good to see you back!');
});
app.listen(3000);

/*
function clientDisconnect(client){
    activeClients -=1;
    client.broadcast({clients:activeClients});
}
*/
