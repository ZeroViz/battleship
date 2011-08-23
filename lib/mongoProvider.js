var Db = require("mongodb").Db;
var Connection = require("mongodb").Connection;
var Server = require("mongodb").Server;

MongoProvider = function(host, port) {
  this.db= new Db('battleship', new Server(host, port, {auto_reconnect: true}, {}));
  this.db.open(function(){});
};

exports.MongoProvider = MongoProvider;
