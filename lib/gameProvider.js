var Db = require("mongodb").Db;
var Connection = require("mongodb").Connection;
var Server = require("mongodb").Server;
var BSON = require("mongodb").BSON;
var ObjectID = require("mongodb").ObjectID;

GameProvider = function(host, port) {
  this.db= new Db('battleship', new Server(host, port, {auto_reconnect: true}, {}));
  this.db.open(function(){});
};

GameProvider.prototype.getCollection = function(callback) {
  this.db.collection('games', function(error, game_collection) {
    if( error ) callback(error);
    else callback(null, game_collection);
  });
}

GameProvider.prototype.findAll = function(callback) {
  this.getCollection(function(error, game_collection) {
    if( error ) callback(error)
    else {
      game_collection.find().toArray(function(error, results) {
        if( error ) callback(error)
        else callback( null, results)
      });
    }
  });
};

GameProvider.prototype.findById = function(id, callback) {
  this.getCollection(function(error, game_collection) {
    if( error ) callback(error)
    else {
      game_collection.findOne({_id: game_collection.db.bson_serializer.ObjectID.createFromHexString(id)}, function(error, result) {
        if( error ) callback(error)
        else callback( null, result)
      });
    }
  });
}

GameProvider.prototype.save = function(games, callback) {
  this.getCollection(function(error, game_collection) {
    if( error ) callback(error)
    else {
      if (typeof(games.length) == "undefined") {
        games = [games];
      }
      for (var i = 0; i < games.length; i++ ) {
        game = games[i];
        game.created_at = new Date();
        game_collection.save(game, function() {
          callback(null, game);
        });
      }

    }
  });
};

GameProvider.prototype.update = function(game, callback) {
  this.getCollection(function(error, game_collection) {
    if( error ) callback(error)
    else {
      game_collection.update({_id: game_collection.db.bson_serializer.ObjectID.createFromHexString(game._id)}, {$set: {name: game.name, email: game.email}}, {multi:true}, function(err) {
          if (err) console.warn(err.message);
          else console.log('successfully updated: ' + game._id);
          callback(null, game);
      });
    }
  });
};

GameProvider.prototype.remove = function(id, callback) {
  this.getCollection(function(error, game_collection) {
    if( error ) callback(error)
    else {
      game_collection.remove({_id: game_collection.db.bson_serializer.ObjectID.createFromHexString(id)} , function(err) {
          if (err) console.warn(err.message);
          else console.log('successfully removed: ' + id);
          callback(null, id);
      });
    }
  });
};

exports.GameProvider = GameProvider;

