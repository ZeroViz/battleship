var log4js = require('log4js'),
    log = log4js.getLogger('gameProvider');
var BSON = require("mongodb").BSON;
var ObjectID = require("mongodb").ObjectID;
var MongoProvider = require('./mongoProvider.js').MongoProvider;

var mongoProvider = new MongoProvider('localhost', 27017);

GameProvider = function(collection) {
  this.collection = collection;
};

GameProvider.prototype.getCollection = function(callback) {
  mongoProvider.db.collection(this.collection, function(error, game_collection) {
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
      game_collection.findOne({_id: parseInt(id)}, function(error, result) {
        if( error ) callback(error)
        else callback( null, result)
      });
    }
  });
}

GameProvider.prototype.getUniqueId = function(id, callback) {
  this.getCollection(function(error, game_collection) {
    if( error ) callback(error)
    else {
      game_collection.findAndModify({_id: id}, [['_id','asc']], {$inc: {count:1}}, {upsert:true,new:true}, function(error, result) {
        log.trace('getUniqueId:getCollection:findAndModify');
        if( error ) callback(error)
        else callback( null, result.count)
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
        game.modified_at = new Date();
        if (game._id === 'undefined' && game.id) {
          game._id = game.id;
        }
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
      game.data.modified_at = new Date();
      game_collection.update({_id: parseInt(game._id)}, {$set: game.data}, {multi:true, safe:true}, function(err) {
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
      game_collection.remove({_id: parseInt(id)} , function(err) {
          if (err) console.warn(err.message);
          else console.log('successfully removed: ' + id);
          callback(null, id);
      });
    }
  });
};

exports.GameProvider = GameProvider;

