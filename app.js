
/**
 * Module dependencies.
 */
var log4js = require('log4js'),
    log = log4js.getLogger('app'),
    express = require('express'),
    MemoryStore = express.session.MemoryStore,
    sessionStore = new MemoryStore(),
    connect = require('express/node_modules/connect'),
    Session = connect.middleware.session.Session,
    parseCookie = connect.utils.parseCookie,
    app = express.createServer(),
    io = require('socket.io')
      .listen(app, { logger: log4js.getLogger('socket'),
                     'log level': log4js.levels.INFO }
             ),
    server_io = require('./lib/server.io')
      .listen(io),
    GameProvider = require('./lib/gameProvider.js').GameProvider;

// Configuration

app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({
    store: sessionStore,
    secret: 'secret',
    key: 'express.sid'
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function () {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
  app.use(express.errorHandler());
});

// Mongo DB

var gameProvider = new GameProvider('localhost', 27017);

// Socket.IO

io.configure(function () {
  io.set('authorization', function (data, accept) {
    var result;
    if (data.headers.cookie) {
      data.cookie = parseCookie(data.headers.cookie);
      data.sessionID = data.cookie['express.sid'];
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


// Routes

app.get('/', function (req, res) {
  res.render('index', {sess: req.sessionID});
});

// static routes to common js files
var add_route = function (file) {
  app.get('/battleship/' + file, function (req, res, next) {
    log.info('serving custom file ' + req.url + ' as ' + file);
    express.static.send(req, res, next, {
      root: './lib',
      path: file,
      getOnly: true
    });
  });
};

add_route('client.io.js');
add_route('battleship.js');

app.listen(3000);
log.info("Battleship server listening on port %d in %s mode",
    app.address().port,
    app.settings.env);
