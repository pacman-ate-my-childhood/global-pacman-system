
var _ = require('underscore'),
    Model = require('./model.js');


var Map = Model.build('map', true);

Map.prototype.vertices = [ ];

Map.prototype.edges = [ ];

Map.prototype.pacman_home = null;

Map.prototype.ghost_home = null;

Map.prototype.centre = null;

Map.create = function(id, raw, callback) {
   raw.centre = _.reduce(raw.vertices, function(centre, vertex, num, vertices) { 
      centre.lat += vertex.lat / vertices.length;
      centre.long += vertex.long / vertices.length;
      return centre; 
   }, { long:0, lat:0 });

   Map.static.create(id, raw, callback);
};


module.exports = Map;
