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
      assert.deepEqual(topic.players, [ { id: 1 }, { id: 2 } ]);
      assert.deepEqual(topic.seas, { 1: { fleet: { ships: [] }, actions: [] },
                                     2: { fleet: { ships: [] }, actions: [] } });
      assert.deepEqual(topic.size, [10, 10]);
      assert.deepEqual(topic.ruleset, Battleship.Ruleset.normal);
      assert.equal(topic.id, 1);
    },
    'and then creating a second game': {
      topic: function () { return Battleship.create_game({
               id: 2,
               players: [3, 4]
             })},
      'the first game\'s info should not interfere with the second\'s': function (topic) {
        assert.deepEqual(topic.players, [ { id: 3 }, { id: 4 } ]);
        assert.deepEqual(topic.seas, { 3: { fleet: { ships: [] }, actions: [] },
                                       4: { fleet: { ships: [] }, actions: [] } });
        assert.deepEqual(topic.size, [10, 10]);
        assert.deepEqual(topic.ruleset, Battleship.Ruleset.normal);
        assert.equal(topic.id, 2);
      }
    },
    'we will deploy a fleet': {
      topic: function() { return Battleship.do_deploy(
               1, {"ships":[{
                   "type": "battleship",
                   "loc": [0,0],
                   "ori": "s"
                  },
                  {
                   "type": "carrier",
                   "loc": [2,0],
                   "ori": "e"
                  },
                  {
                   "type": "destroyer",
                   "loc": [2,1],
                   "ori": "s"
                  },
                  {
                   "type": "submarine",
                   "loc": [5,5],
                   "ori": "w"
                  },
                  {
                   "type": "cruiser",
                   "loc": [6,8],
                   "ori": "n"
                  }]})
  }
}).export(module);
