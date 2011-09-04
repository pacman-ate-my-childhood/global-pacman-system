
var _ = require('underscore'),
    Channel = require('./channel.js'),
	 Map = require("./map.js"),
    Model = require('./model.js'),
	 step = require('./game_mechanics.js'),
	 geom = require('./geom.js'),
	 MAX_PLAYERS = 5,
    DEGREES_BETWEEN_PILLS = 0.00025;

var Game = Model.build('game', true);

Game.prototype.map_id = null;

Game.prototype.users = {};
Game.prototype.characters = {};
Game.prototype.avaliable_characters = [];

// set to false when the game is full, never reset
Game.prototype.open = true;

Game.prototype.pills = [ ];
Game.prototype.powerpills = [ ];

Game.prototype.score = 0;

Game.prototype.setup = function(callback) {
   Map.get(this.map_id, (function(err, map) {
      if (err) { callback(err); return; }

      this.setup_players(map);
      this.distribute_pills(map);

      this.ghost_home = _.clone(map.ghost_home);

      this.save(callback);
   }).bind(this));
};

Game.prototype.setup_players = function(map) {

   var self = this;

   function add_character(name, location) {
      self.avaliable_characters.push({	
         name: name,
         user_id: null,
         location: _.clone(location)
      });
   }

   add_character('pacman', map.pacman_home);
   
   for (var i = 1; i < MAX_PLAYERS; i++) {
      add_character('ghost' + i, map.ghost_home);
   };
};

Game.prototype.distribute_pills = function(map) {
   var nodes = map.vertices;
   var pillLocations = []; // node: array of arrays

   _(map.edges).each( function(edge){

      var 	node1 = nodes[ edge.a ],
            node2 = nodes[ edge.b ],
            latMin = node1.lat,
            longMin = node1.long,
            latDiff = ( node1.lat - node2.lat ),
            longDiff = ( node1.long - node2.long ),
            dist = ( Math.sqrt( Math.pow(latDiff,2) + Math.pow(longDiff,2) ) ),
            num_pills = Math.round( Math.abs(dist) / DEGREES_BETWEEN_PILLS );

      pillLocations[pillLocations.length] =
         _(_.range(0, num_pills +1)).map( function(pillNo){
            var frac = (pillNo/num_pills);

            return {
                  lat:latMin - frac * latDiff
               ,	long:longMin - frac * longDiff
               };
         });

   });

   // pillLocations is array of arrays. Pick at random pills at start of street to be power pills
   for( var i = 0; i < 4 ; i++ ) {
      var pillList = pillLocations[ Math.round( Math.random() * pillLocations.length -1 ) ];
      if( pillList && pillList.length > 0 ){
         pillList[0].isPower = true;
      }
   }

   pillLocations = _(pillLocations).flatten();

   _.each(pillLocations, function(pill, index) {
      pill.id = index;
   });

   // TODO: remove duplicate (or very close) pill locations

   this.pills = _(pillLocations).filter(function(element){
      return !element.isPower;
   });

   this.powerpills = _(pillLocations).filter(function(element){
      return element.isPower;
   });
};


Game.prototype.join = function(user, callback) {
   if (!this.users[user.id]) { // if not already in the game
      if (this.avaliable_characters.length > 0) {
         var character = this.avaliable_characters.shift();

         this.characters[character.name] = character;
         this.users[user.id] = user;

         character.user_id = user.id;
         user.character = character.name;

         console.log(user.character + ' [' + user.id + '] is joining ' + this.id);

         this.save(function(err, game) {
            if (err) callback(err);
            else {
               Channel.get(game.id).emit('joined', user.id, user.nickname, character.name);
               callback(err, game);
            }
         });

      } else {
         callback('there are no characters left to take');
      }
   } else {
      callback('use is already in the game', this);
   }
};

Game.prototype.leave = function(user_id, callback) {
   var user = this.users[user_id],
       character = user && this.characters[user.character];

   console.log((user && user.character) + ' [' + user_id + '] is leaving ' + this.id);

   if (character) { // if the user has a character in this game
      if (character.name === 'pacman') this.avaliable_characters.unshift(character);
      else this.avaliable_characters.push(character);
      
      delete this.users[user_id];
      delete this.characters[character.name];

      if (this.avaliable_characters.length === MAX_PLAYERS) { // the game is now empty
         console.log(this.id + ' has no players so shall be removed');
         this.remove(callback);
      } else {
         this.save(function(err, game) {
            if (err) callback(err);
            else {
               Channel.get(game.id).emit('left', user_id, character.name);
               callback(err, game);
            }
         });
      }
   } else {
      callback('user, ' + user_id + ', is not a part of this game', this);
   }
};


Game.prototype.move_character = function(character, coords, callback){

	var self = this;
   console.log(character.name + ' [' + character.user_id + 
         ',' + this.id + '] is moving to lat:' + coords.latitude + ' lng:' + coords.longitude);

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

		character.location = { long:corrected_coords.longitude, lat:corrected_coords.latitude };

		step( self, Channel.get(self.id), character, corrected_coords );

		callback();
	});
}


Channel.on('created', function(channel, id) {
   channel.on('connection', function(socket) {
      console.log('Client connected to ' + id);

      socket.on('join', function(user_id, nickname) {
         socket.set('user_id', user_id, function() {
            console.log(user_id + ' joining as ' + nickname + ' to ' + id);
            Game.join(id, {
               id: user_id,
               nickname: nickname
            }, function() {});
         });
      });

      socket.on('move', function(coords) {
         socket.get('user_id', function(err, user_id) {
            if (!err) {
               Game.get(id, function(err, game){
                  var user = game.users[user_id];

                  if(!err && user) {
                     var character = game.characters[user.character];


                     game.move_character(character, coords, function(err) {
                        game.save(function(err, game){
                           if( err ) return;
                           else {
                              channel.emit('moved', character.name, character.location);
                           }
                        });
                     });
                  }
               });
            }
         });
      });

      socket.on('disconnect', function() {
         socket.get('user_id', function(err, user_id) {
            console.log(user_id + ' leaving from ' + id);
            if (!err) Game.leave(id, user_id, function() { });
         });
      });
   });
});


Game.create = function(id, raw, callback) {
   raw.avaliable_characters = [ ];
   raw.characters = { };
   raw.users = { };

   Game.static.create(id, raw, function(err, game) {
      if (err) callback(err);
      else {
         game.setup(function(err, game) {
            if (err) callback(err);
            else {
               Channel.ensure(game.id);
               callback(err, game);
            }
         });
      }
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

Game.join = function(id, user, callback) {
   Game.get(id, function(err, game) {
      if (err) return callback(err);

      game.join(user, callback);
   });
};

Game.leave = function(id, user, callback) {
   Game.get(id, function(err, game) {
      if (err) callback(err);
      else {
         game.leave(user, callback);
      }

   });
};

Game.remove = function(id, callback) {
   console.log(id + ' is being removed');
   Game.static.remove(id, function( err ) {
		if( !err ) {
         console.log(id + ' has been removed');
			Channel.get(id).emit('game_over');
         Channel.destroy(id);
		}
		callback(err);
	});
};




module.exports = Game;
