// game-create-test.js

var vows = require('vows'),
    assert = require('assert'),
    Battleship = require('../lib/battleship.js');
Battleship.log.setLevel('ERROR');

var test_deploy = {
  action: {
    type: "shot",
    loc: [0, 0]
  },

  game: Battleship.create_game({
  id: 1,
  players: [1, 2]
}),

  fleet: {
  "ships": [
  { "type": "battleship",
    "loc": [0,0],
    "ori": "s" },
  { "type": "carrier",
    "loc": [2,0],
    "ori": "e" },
  { "type": "destroyer",
    "loc": [2,1],
    "ori": "s" },
  { "type": "submarine",
    "loc": [5,5],
    "ori": "w" },
  { "type": "cruiser",
    "loc": [6,8],
    "ori": "n" } ]
         },

  overlap_fleet: {
  "ships": [
  { "type": "battleship",
    "loc": [0,0],
    "ori": "s" },
  { "type": "carrier",
    "loc": [2,0],
    "ori": "e" },
  { "type": "destroyer",
    "loc": [0,3],
    "ori": "s" },
  { "type": "submarine",
    "loc": [5,5],
    "ori": "w" },
  { "type": "cruiser",
    "loc": [6,8],
    "ori": "n" } ]
         },

  fleet_full: {
  "ships": [
  { "type": "battleship",
    "loc": [0,0],
    "ori": "s",
    "size": 4,
    "status": []},
  { "type": "carrier",
    "loc": [2,0],
    "ori": "e",
    "size": 5,
    "status": []},
  { "type": "destroyer",
    "loc": [2,1],
    "ori": "s",
    "size": 3,
    "status": []},
  { "type": "submarine",
    "loc": [5,5],
    "ori": "w",
    "size": 3,
    "status": []},
  { "type": "cruiser",
    "loc": [6,8],
    "ori": "n",
    "size": 2,
    "status": [] } ]
}
};

// create a test suite
vows.describe('Creating a Game').addBatch({
  'when deploying a fleet': {
    topic: function () {
      test_deploy.game.do_deploy(1, test_deploy.fleet);
      return test_deploy.game;
    },

    'the fleet is added to the correct sea': function (topic) {
      assert.deepEqual(topic.seas[1].fleet, test_deploy.fleet_full);
      assert.deepEqual(topic.seas[2].fleet, { ships: [] });
    },

    'and then changing the original object': {
      topic: function () {
        test_deploy.fleet.ships[0].loc[0] = 1;
        return test_deploy.game;
      },

      'does not change the game': function (topic) {
        assert.equal(topic.seas[1].fleet.ships[0].loc[0], 0);
      }
    }
  },
   
  'when deploying a fleet with overlapping ships': {
    topic: function () {
      var object = test_deploy.game.do_deploy(1, test_deploy.overlap_fleet);
      return object  
    },
    'an error will result': function (topic) {
       assert.deepEqual(topic, ['position 0,3 is overlapping']);
    }
  }
}).export(module);
