// matchmaker-test.js

var vows = require('vows'),
    assert = require('assert'),
    MatchMaker = require('../lib/matchmaker.js'),

    create_game = function (players) {
      return { name: 'game',
               players: players.map(function (value) {
                 return typeof value === 'object' ? value.id : value;
               })
             };
};

vows.describe('Using the MatchMaker').addBatch({
  'when creating a new matchmaker': {
    topic: function () { return MatchMaker(create_game, { logLevel: 'ERROR' }); },
    
    'we get a proper matchmaker object without errors': function (topic) {
      assert.equal(typeof topic, 'object');
      assert.equal(typeof topic.add_player, 'function');
      assert.equal(typeof topic.remove_player, 'function');
    }
  },
  'when we add 2 players to a fifo queue': {
    topic: function () {
             var mm = MatchMaker(create_game, { logLevel: 'ERROR' });
             var game1, game2;
             mm.add_player(1, function (game) { game1 = game });
             mm.add_player(2, function (game) { game2 = game });
             return [game1, game2];
           },

    'we get a game object for each player': function (topic) {
      assert.deepEqual(topic, [
        { name: 'game',
          players: [1,2]
        },
        { name: 'game',
          players: [1,2]
        }]);
    }
  }
}).export(module);
