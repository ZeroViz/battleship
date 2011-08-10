
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
                           'log level': log4js.levels['INFO'] }),
    bsio = require('./server.io')(io);

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

// Socket.IO

io.configure(function (){
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


io.sockets.on('connection', function(socket) {
    var hs = socket.handshake;
    // join private room for session
    socket.join(hs.sessionID);
});

// Routes

app.get('/', function(req, res){
    res.render('index', {sess: req.sessionID});
});

app.get('/feed', function (req, res) {
    res.render('feed', {title: 'News Feed'});
});

app.listen(3000);
log.info("Battleship server listening on port %d in %s mode",
         app.address().port,
         app.settings.env);
