// matchmaker-test.js

var vows = require('vows'),
    assert = require('assert'),
    MatchMaker = require('../lib/matchmaker.js');

vows.describe('Using the MatchMaker').addBatch({
  'when creating a new matchmaker': {
    topic: function () {
      return MatchMaker({ logLevel: 'ERROR' });
    },
    
    'we get a proper matchmaker object without errors': function (topic) {
      assert.equal(typeof topic, 'object');
      assert.equal(typeof topic.add_player, 'function');
      assert.equal(typeof topic.remove_player, 'function');
    }
  },
  'when we add 1 player to a fifo queue': {
    topic: function () {
      var mm = MatchMaker({ logLevel: 'ERROR' });
      mm.add_player({ id: 1 });
      return mm.get_waiting();
    },

    'we remember they are in the queue': function (topic) {
      assert.deepEqual(topic, [
          { matchtype: 'fifo',
            max: 2,
            ruleset: 'normal',
            players: [{ id: 1 }]
          }
      ]);
    }
  },
  'when we add 2 players to a fifo queue': {
    topic: function () {
      var mm = MatchMaker({ logLevel: 'ERROR' });
      mm.add_player({ id: 1, extra: 'test' });
      return mm.add_player({ id: 2 });
    },

    'we get a list containing the two players': function (topic) {
      assert.deepEqual(topic, [
        { id: 1, extra: 'test' },
        { id: 2 }
      ]);
    }
  },
  'when we add the same player twice': {
    topic: function () {
      var mm = MatchMaker({ logLevel: 'ERROR' });
      mm.add_player({ id: 1 });
      return mm.add_player({ id: 1 });
    },

    'we do not get a list yet': function (topic) {
      assert.deepEqual(topic, null);
    }
  },
  'when we add a player to some games and then remove': {
    topic: function () {
      var mm = MatchMaker({ logLevel: 'ERROR' });
      mm.add_player({ id: 1 }, { max: 3 });
      mm.add_player({ id: 2 }, { max: 3 });
      mm.add_player({ id: 1 });
      mm.remove_player({ id: 1 });
      return mm.get_waiting();
    },

    'we remember only games with remaining players': function (topic) {
      assert.deepEqual(topic, [
          { matchtype: 'fifo',
            max: 3,
            ruleset: 'normal',
            players: [{ id: 2 }]
          }
      ]);
    }
  }
}).export(module);
