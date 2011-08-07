
/**
 * Module dependencies.
 */

var express = require('express'),
    MemoryStore = express.session.MemoryStore,
    sessionStore = new MemoryStore(),
    connect = require('express/node_modules/connect'),
    Session = connect.middleware.session.Session,
    parseCookie = connect.utils.parseCookie,
    app = express.createServer(),
    io = require('socket.io').listen(app),
    Logger = require('socket.io/lib/logger'),
    log = new Logger();
 
// Configuration

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.cookieParser());
    app.use(express.session({
        store: sessionStore,
        secret: 'secret',
        key: 'express.sid'}));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

// Custom

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

// Socket.IO

io.configure(function (){
  io.set('authorization', function (data, accept) {
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

io.sockets.on('connection', function(socket) {
    var hs = socket.handshake;

    var op = games[hs.gameID].filter(function(e){
        var result;                                   
        if (e!==hs.sessionID) {e = result;}
        return result;
    }).join(",");

    socket.join(hs.gameID);
  
    io.sockets.in(hs.gameID).send({challenger:op});

    socket.on('error', function(reason){
        log.error('Socket unable to connect: ', reason);
    });

    socket.on('disconnect', function(){
        log.info('Socket ' + hs.sessionID + ' has disconnected');
    });
});

// Routes

app.get('/', function(req, res){
    res.render('index', {sess: req.sessionID});
});

app.get('/feed', function (req, res) {
    res.render('feed', { title: 'News Feed' });
});

app.listen(3000);
log.info("Battleship server listening on port " + app.address().port + " in " + app.settings.env + " mode");
