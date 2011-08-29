

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

exports.distanceToLine = distanceToLine;