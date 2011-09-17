
/* This file is very lazily browser/node compatible.
	If we have any more like this (or we just want to make something nicer) we should probably do it properly
 */

if( typeof require != 'undefined' ) {
	var _ = require('underscore');
}

function closestPointOnGraph( vertices, edges, x, y ) {

	function inOrderOfClosestFirst (distanceInfoA, distanceInfoB){
		return distanceInfoA.distanceSquared - distanceInfoB.distanceSquared;
	}

	function edgeToDistanceInformation(edge, edgeId){
		var 	v1 = vertices[ edge.a ],
				v2 = vertices[ edge.b ];

		var rtn = distanceToLineSquared(
			x, y,
			+v1.long, +v1.lat,
			+v2.long, +v2.lat);

		rtn.edgeId = edgeId;
		rtn.edge = edge;
		return rtn;
	}

	return _(edges)
				.chain()
				.map(edgeToDistanceInformation)
				.sort(inOrderOfClosestFirst).first() // reduce to just the closest point
				.value(); // break out of underscore
}

/* Gets the closest point on line (x0, y0, x1, y1) to point (x,y)
	and the distance squared to that point (which is faster to calculate
	than the actual distance and a lot of the time just as useful)
 */
function distanceToLineSquared( x, y, x0, y0, x1, y1 ) {
	var closest = closestPointOnLine( x, y, x0, y0, x1, y1 );

	return 	{	closest: closest
				,	distanceSquared: lineLengthSquared(x,y,closest.x,closest.y)
				};
}

/* Gets the closest point on line (x0, y0, x1, y1) to point (x,y)
	and the distance to that point
 */
function distanceToLine( x, y, x0, y0, x1, y1 ) {
	var closest = closestPointOnLine( x, y, x0, y0, x1, y1 );

	return 	{	closest: closest
				,	distance: lineLength(x,y,closest.x,closest.y)
				};
}

function closestPointOnLine( x, y, x0, y0, x1, y1 ) {

	var closestInterp = closestLinearInterpolation(x, y, x0, y0, x1, y1);

	if( closestInterp < 0 ) {
		// y1,y2 is the closest point on the line
		return { x:x0, y:y0 };
	}else if( closestInterp >1 ) {
		// x1,x2 is the closest point on the line
		return { x:x1, y:y1 };
	}else {
		// closest point is somwehere on the line
		var xdist = x1 - x0;
		var ydist = y1 - y0;

		return {
			x: x0 + closestInterp * xdist,
			y: y0 + closestInterp * ydist
		};
	}
}

function closestLinearInterpolation(x, y, x0, y0, x1, y1) {

	var xChange = x1 - x0;
	var yChange = y1 - y0;

	return ((x - x0) * xChange + (y - y0) * yChange) / lineLengthSquared(x0, y0, x1, y1);
}

function lineLengthSquared(x0, y0, x1, y1) {
	var xdist = x1 - x0;
	var ydist = y1 - y0;

	return xdist * xdist + ydist * ydist;
}

function lineLength(x0, y0, x1, y1) {
	return Math.sqrt(lineLengthSquared(x0, y0, x1, y1));
}

// hello

if( typeof exports != 'undefined' ) {
	console.log("exporting!");

	exports.closestPointOnGraph = closestPointOnGraph;
	exports.distanceToLine = distanceToLine;
	exports.distanceToLineSquared = distanceToLineSquared;
	exports.lineLength = lineLength;
	exports.lineLengthSquared = lineLengthSquared;
}