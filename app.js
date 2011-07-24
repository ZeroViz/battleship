var express = require('express');
var app = express.createServer();

app.configure(function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser());
  app.use(express.session({secret: 'asdf jkl;', cookie: {maxAge: 60000}}));
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(app.router);
  app.set('views',__dirname + '/views');
});

app.configure('development', function(){
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// games in progress
var gip = [[]];

app.get('/', function (req, res){
  var sess = req.session;
  // add some sort of unique identifier to the cookie

  // check to see if there's a game started with only one player waiting for another,
  // if so, add this user, otherwise create a new game and wait for another player
  res.send(sess.cookie);
  
});

app.listen(3000);
