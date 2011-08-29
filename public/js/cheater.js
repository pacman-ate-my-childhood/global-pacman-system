function Cheater(engine, callback){
	$('#charCanvas').click(function(evt){

		var longlat = coords.x_y_to_long_lat({x:evt.offsetX || evt.layerX, y:evt.offsetY || evt.layerY});

      var position = {
         coords: {
            longitude: longlat.long,
            latitude: longlat.lat,
            accuracy: 1
         },
         timestamp: Date.now()
      };

      callback(position);
	});
}
