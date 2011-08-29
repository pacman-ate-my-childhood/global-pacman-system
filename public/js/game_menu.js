function GameMenu( game_state ){
	this.game_state = game_state;
}

GameMenu.prototype.init_events = function() {
	var id = this.game_state.id;

	$('#end').bind('click', function(evt) {
		// remove game
		$.ajax('/api/game/' + id + '/remove', {
			dataType: 'json',
			type: 'POST',
			success: function(data) {
				if (!data.error) { window.location = window.location.protocol + '//' + window.location.host + '/'; }
				else { alert('error removing game'); console.log(data.error); }
			}
		});
	});

	$('#leave').bind('click', function(evt) {
		// remove game
		$.ajax('/api/game/' + id + '/leave', {
			dataType: 'json',
			type: 'POST',
			success: function(data) {
				if (!data.error) { window.location = window.location.protocol + '//' + window.location.host + '/'; }
				else { alert('error leaving game'); console.log(data.error); }
			}
		});
	});
}
