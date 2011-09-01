
var _ = require('underscore'),
    Model = require('./model.js');

//var DEGREES_BETWEEN_PILLS = 0.1;

var Map = Model.build('map');

Map.prototype.vertices = [ ];

Map.prototype.edges = [ ];

Map.prototype.pacman_home = null;

Map.prototype.ghost_home = null;

Map.prototype.centre = null;

/* Return the pills for this map to add into the game */

Map.create = function(id, raw, callback) {
   raw.centre = _.reduce(raw.vertices, function(centre, vertex, num, vertices) { 
      centre.lat += vertex.lat / vertices.length;
      centre.long += vertex.long / vertices.length;
      return centre; 
   }, { long:0, lat:0 });

   Map.static.create(id, raw, callback);
};


module.exports = Map;
