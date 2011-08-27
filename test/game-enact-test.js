// game-create-test.js

var vows = require('vows'),
    assert = require('assert'),
    Battleship = require('../lib/battleship.js');
//Battleship.log.setLevel('ERROR');

var test_action = {
  id: 1,
  type: "shot",
  loc: [0, 0]
};

var test_action_report = {
  id: 1,
  type: 'shot',
  loc: [0, 0],
  reports: [
    { loc: [0, 0],
      affect: 'hit' }
  ]
};

var test_fleet = {
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
};

var test_game = Battleship.create_game({
  id: 1,
  players: [1, 2]
});
test_game.do_deploy(1, test_fleet);
test_game.do_deploy(2, test_fleet);
test_game.start_game();
test_game.start_turn();

// create a test suite
vows.describe('Creating a Game').addBatch({
  'when adding an action': {
    topic: function () {
      test_game.do_enact(1, test_action);
      return test_game;
    },

    'the correct sea is updated': function (topic) {
      assert.deepEqual(topic.seas[1].actions, [test_action_report]);
      assert.deepEqual(topic.seas[2].actions, []);
    },

    'and then changing the original object': {
      topic: function () {
        test_action.loc[0] = 1;
        return test_game;
      },

      'does not change the game': function (topic) {
        assert.equal(topic.seas[1].actions[0].loc[0], 0);
      }
    }
  }
}).export(module);
