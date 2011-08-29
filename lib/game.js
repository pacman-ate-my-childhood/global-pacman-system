
var _ = require('underscore'),
    redback = require('redback').createClient(),
	 Map = require("./map.js"),
    game_hash = redback.createHash('game'),
	 mem_game_hash = {},
	 step = require('./game_mechanics.js'),
	 geom = require('./geom.js'),
	 MAX_PLAYERS = 5;

/** this will persist between requests */
var channelHash = {};

function Game(id, params) {
   this.id = id;
   params && this.parse(params);
}

Game.prototype.id = null;

Game.prototype.map_id = null;

Game.prototype.created_by = null;

Game.prototype.users = {};
Game.prototype.characters = {};

// set to false when the game is full, never reset
Game.prototype.open = true;

Game.prototype.pills = [ ];
Game.prototype.powerpills = [ ];

Game.prototype.score = 0;

Game.prototype.parse = function(params) {
   this.map_id = params.map_id;
   this.created_by = params.created_by;
   this.users = params.users;
	this.characters = params.characters;
	this.open = params.open;
   this.score = params.score;
   this.mode = params.mode;
   this.ghost_home = params.ghost_home;
   this.timestamp = params.timestamp;

	// (power)pills will not be set on create, but will be there in the database:
	this.pills = params.pills || [];
	this.powerpills = params.powerpills || [];
};

Game.prototype.save = function(callback) {

	console.log( "SAVING game.prototype.save" );
	if( this.isDead ){
		console.log("game is dead, not saving");
		callback(null, this); return;
	}

   game_hash.set(this.id, JSON.stringify(this), (function(err) { 
      callback(err, this);
   }).bind(this));
};

Game.prototype.load = function(callback) {
   if (!this.id) throw new Excpetion('no id to load game with');

   game_hash.get(this.id, (function(err, game_json) {
      this.parse(JSON.parse(game_json));
      callback(null, this);
   }).bind(this));
};

Game.prototype.remove = function(callback){
	Game.remove(this.id, callback);
}

Game.prototype.moveCharacter = function( character, coords, callback ){

	var self = this;

	// find closest edge and snap to it:
	Map.get(this.map_id, function( err, map ){
		if( err ) return callback(err);

		var edges = map.edges,
			 vertices = map.vertices;

		var closestDistanceInfo =
			_(edges)
				.chain()
				.map( function(edge){
					var 	v1 = vertices[ edge.a ],
							v2 = vertices[ edge.b ],
							distanceInfo = geom.distanceToLine(
								+coords.longitude, +coords.latitude,
								+v1.long, +v1.lat,
								+v2.long, +v2.lat);

					return distanceInfo;
				})
				.sort(function(distanceInfoA, distanceInfoB){
					return distanceInfoA.distance - distanceInfoB.distance;
				})
				.first()
				.value();

		var corrected_coords = _.clone(coords);
		corrected_coords.latitude = closestDistanceInfo.closest.y;
		corrected_coords.longitude = closestDistanceInfo.closest.x;

		self.characters[character].location = { long:corrected_coords.longitude, lat:corrected_coords.latitude };

		step( self, channelHash[self.id], character, corrected_coords );

		callback();
	});
}



function setup_channel(id, channel) {
	channelHash[id] = channel;

   channel.on('connection', function(socket) {
      socket.on('move', function(data) {

			Game.get(id, function(err, game){
				if( err ) return err;

				var character = game.users[data.username];
				game.moveCharacter(character , data.coords, function( err ){
					game.save(function(err, game){
						if( err ) return;

						channel.emit('move',
							{	character:character
							,	location:game.characters[character].location
							});
					});
				});
			});
		});
   });
}


Game.create = function(params, channel, callback) {

   var game = new Game(params.id, params);

	mem_game_hash[params.id] = game;

   // setup the new socket io channel to listen out for required events
   setup_channel(params.id, channel);

	Map.get(params.map_id, function( err, map ){

		game.characters['pacman'] =
			{	username: params.created_by
			,	location: map.pacman_home
			};
		game.users[params.created_by] = 'pacman';
      game.ghost_home = _.clone(map.ghost_home);

		// distribute power pills in the game along the map edges
		var pills = map.distribute_pills();

		game.pills = pills.pills;
		game.powerpills = pills.powerpills;

		game.save(callback);
	});

};

Game.get = function(id, callback) {
	if( mem_game_hash[id] ){
		callback(null, mem_game_hash[id]);
	} else {
   	(new Game(id)).load(callback);
	}
};

Game.join = function(id, username, callback) {
   Game.get(id, function(err, game) {
      if (err) return callback(err);

		if( !game.open ){
			return callback( "game is not open" );
		}

      if (!game.users[username]) { // if not already in the game

			Map.get(game.map_id, function( err, map ){
				if (err) return callback(err);

				var character = 'ghost' + _.size(game.characters);
				game.users[username] = character;
				game.characters[character] = {
					username: username,
					location: map.ghost_home
				};
				game.open = (_.size(game.characters) < MAX_PLAYERS);

				game.save(function(err, game){
					if (err) return callback(err);

					channelHash[id].emit('join',{username:username, character:character});
					callback(err, game);
				});
			});
      } else {
         callback(err, game);
      }
   });
};

Game.leave = function(id, username, callback) {
   Game.get(id, function(err, game) {
      if (err) return callback(err);

		var character = game.users[username];

		delete game.characters[ character ];
		delete game.users[username];

      if (_.size(game.users) == 0) {
         Game.remove(id, callback);
      } else {
         game.save(function() {
				channelHash[id].emit('leave',{username:username, character: character});
				callback();
			});
      }
   });
};

Game.list = function(callback) {
   game_hash.values(function(err, arr) {
      if (!err) {
         arr = _.map(arr, function(a) { return JSON.parse(a); });
      }
      callback(err, arr);
   });
};

Game.remove = function(id, callback) {

   game_hash.del(id, function( err ) {
		if( !err ) {
			channelHash[id].emit('game_over');
			delete channelHash[id];
		}
		callback(err);
	});
};




module.exports = Game;
