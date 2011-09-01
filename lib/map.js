
var _ = require('underscore'),
    Model = require('./model.js');

//var DEGREES_BETWEEN_PILLS = 0.1;
var DEGREES_BETWEEN_PILLS = 0.00025;

var Map = Model.build('map');

Map.prototype.vertices = [ ];

Map.prototype.edges = [ ];

Map.prototype.pacman_home = null;

Map.prototype.ghost_home = null;

Map.prototype.centre = null;

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


Map.create = function(id, raw, callback) {
   raw.centre = _.reduce(raw.vertices, function(centre, vertex, num, vertices) { 
      centre.lat += vertex.lat / vertices.length;
      centre.long += vertex.long / vertices.length;
      return centre; 
   }, { long:0, lat:0 });

   Map.static.create(id, raw, callback);
};


module.exports = Map;
