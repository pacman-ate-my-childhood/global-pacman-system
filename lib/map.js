
var _ = require('underscore'),
    redback = require('redback').createClient(),
    map_hash = redback.createHash('map'),
	 _ = require("underscore");

//var DEGREES_BETWEEN_PILLS = 0.1;
var DEGREES_BETWEEN_PILLS = 0.00025;

function Map(id, params) {
   this.id = id;
   params && this.parse(params);
}

Map.prototype.id = null;

Map.prototype.vertices = [ ];

Map.prototype.edges = [ ];

Map.prototype.pacman_home = null;

Map.prototype.ghost_home = null;

Map.prototype.parse = function(params) {
   this.vertices = params.vertices;
   this.edges = params.edges;
   this.pacman_home = params.pacman_home;
   this.ghost_home = params.ghost_home;
};

Map.prototype.save = function(callback) {
   map_hash.set(this.id, JSON.stringify(this), (function(err) {
      callback(err, this);
   }).bind(this));
};

Map.prototype.load = function(callback) {
   map_hash.get(this.id, (function(err, map_json) {
      if (err) callback(err);

      this.parse(JSON.parse(map_json));
      callback(err, this);
   }).bind(this));
};

/* Return the pills for this map to add into the game */
Map.prototype.distribute_pills = function() {

	var nodes = this.vertices;
	var pillLocations = []; // node: array of arrays

	_(this.edges).each( function(edge){

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

		//console.log( "will distribute", num_pills, "pills to children on this street", rowPills );
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

	return {
		pills: _(pillLocations).filter(function(element){
			return !element.isPower;
		})
	,	powerpills: _(pillLocations).filter(function(element){
			return element.isPower;
		})
	};
};


Map.create = function(params, callback) {
   console.log(params);
   (new Map(params.id, params)).save(callback);
};

Map.list = function(callback) {
   map_hash.keys(callback);
};

Map.get = function(id, callback) {
   (new Map(id)).load(callback);
};

Map.remove = function(id, callback) {
   map_hash.del(id, callback);
};


module.exports = Map;
