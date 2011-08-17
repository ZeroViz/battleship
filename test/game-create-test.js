// game-create-test.js

var vows = require('vows'),
    assert = require('assert'),
    Battleship = require('../lib/battleship.js');
Battleship.log.setLevel('ERROR');

// create a test suite
vows.describe('Creating a Game').addBatch({
  'when creating a normal game with 2 players': {
    topic: function () { return Battleship.create_game({
             id: 1,
             players: [1, 2]
           })},

    'we get a game class with 2 seas and the proper size board': function (topic) {
      assert.deepEqual (topic, {
        id: 1,
        players: [ { id: 1 }, { id: 2 } ],
        seas: { 1: {}, 2: {} },
        ruleset: Battleship.Ruleset.normal
      });
    }/*,
    'and then creating a second game': {
      topic: function () { return Battleship.create_game({
               id: 2,
               players: [3, 4]
             })},
      'the first game\'s info should not interfere with the second\'s': function (topic) {
        assert.deepEqual (topic, {
          id: 2,
          players: [3,4],
          seas: { 3: {}, 4: {} },
          ruleset: { type: 'normal' },
          size: [10,10]
        });
      }
    }*/
  }
}).export(module);
