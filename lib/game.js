
var _ = require('underscore'),
    Channel = require('./channel.js'),
	 Map = require("./map.js"),
    Model = require('./model.js'),
	 step = require('./game_mechanics.js'),
	 geom = require('./geom.js'),
	 MAX_PLAYERS = 5;

var Game = Model.build('game', true);

Game.prototype.map_id = null;

Game.prototype.created_by = null;

Game.prototype.users = {};
Game.prototype.characters = {};

// set to false when the game is full, never reset
Game.prototype.open = true;

Game.prototype.pills = [ ];
Game.prototype.powerpills = [ ];

Game.prototype.score = 0;

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

		step( self, Channel.get(self.id), character, corrected_coords );

		callback();
	});
}


Channel.on('created', function(channel, id) {
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
});


Game.create = function(id, raw, callback) {
	Map.get(raw.map_id, function( err, map ){

		raw.characters['pacman'] =
			{	username: raw.created_by
			,	location: map.pacman_home
			};
		raw.users[raw.created_by] = 'pacman';
      raw.ghost_home = _.clone(map.ghost_home);

		// distribute power pills in the game along the map edges
		var pills = map.distribute_pills();

		raw.pills = pills.pills;
		raw.powerpills = pills.powerpills;

      Game.static.create(id, raw, function(err, game) {
         if (err) callback(err);
         else {
            Channel.ensure(game.id);
            callback(err, game);
         }
      });
	});

};

Game.get = function(id, callback) {
   Game.static.get(id, function(err, game) {
      if (err) callback(err);
      else {
         Channel.ensure(game.id);
         callback(err, game);
      }
   });
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

					Channel.get(game.id).emit('join',{username:username, character:character});
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
         game.save(function(err, game) {
				if (!err) Channel.get(game.id).emit('leave',{username:username, character: character});
				callback(err);
			});
      }
   });
};

Game.remove = function(id, callback) {

   Game.static.remove(id, function( err ) {
		if( !err ) {
			Channel.get(id).emit('game_over');
         Channel.destroy(id);
		}
		callback(err);
	});
};




module.exports = Game;
