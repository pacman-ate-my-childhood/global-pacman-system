var vertices = [],
	 edges = [];


$(document).ready(function() {

	var latlng = new google.maps.LatLng(51.504469, -0.136986),
		 map = new google.maps.Map(document.getElementById('map'), { zoom: 8, center: latlng, mapTypeId: google.maps.MapTypeId.ROADMAP });

	google.maps.event.addListener(map, 'click', function(event) {
		new google.maps.Marker({ position: event.latLng, map: map });
		$('#lat').val(event.latLng.lat());
		$('#long').val(event.latLng.lng());
	});
});




function populate_lists() {
	$('#vertices').empty();

	_.each(vertices, function(vertex, key) {
		if (vertex) $('#vertices').append($('<option value="' + key + '">[' + key + '] Long:' + vertex.long + ' Lat:' + vertex.lat + '</option>'));
	});

	$('#edges').empty();

	_.each(edges, function(edge, key) {
		$('#edges').append($('<option value="' + key + '">' + edge.a + ' <-> ' + edge.b + '</option>'));
	});
}

$('#add').bind('click', function(evt) {
	var long = $('#long').val(),
		 lat = $('#lat').val();

	$('#long').val('');
	$('#lat').val('');

	vertices.push({long: +long, lat: +lat});
	populate_lists();

	evt.preventDefault();
});

$('#join').bind('click', function(evt) {
	var vertices = $('#vertices').val();

	if (vertices && vertices.length && vertices.length === 2) {
		edges.push({ a: +vertices[0], b: +vertices[1] });
		populate_lists();
	} else {
		alert('incorrect number of vertices selected, must be 2');
	}

	evt.preventDefault();
});

$('#remove_vertices').bind('click', function(evt) {
	var vs = $('#vertices').val(),
		 num_removed = 0;

	function remove_vertex(id) {
		id = +id - num_removed;
		vertices.splice(id, 1);
		edges = _.filter(edges, function(edge) { return edge.a !== id && edge.b !== id; });
		_.each(edges, function(edge) {
			edge.a = (edge.a > id) ? (edge.a - 1) : edge.a;
			edge.b = (edge.b > id) ? (edge.b - 1) : edge.b;
		});
		num_removed++;
	}

	if (vs) {
		if (vs.length) { vs.sort(function(a,b) { return a - b; }); _.each(vs, remove_vertex); }
		else { remove_vertex(+vs); }

		populate_lists();
	}

	evt.preventDefault();
});

$('#remove_edges').bind('click', function(evt) {
	var edges_selected = $('#edges').val();

	if (edges_selected) {
		if (edges_selected.length) {
			for (var i = 0, len = edges_selected.length; i < len; i++) {
				edges.splice(+edges_selected[i], 1);
			}
		} else {
			edges.splice(+edges_selected, 1);
		}

		populate_lists();
	}

	evt.preventDefault();
});

$('#create').bind('click', function(evt) {

	var pacman_home_id = $('#pacman_home').val(),
		 ghost_home_id = $('#ghost_home').val();

	var pacman_home = vertices[(pacman_home_id === '') ? null : +pacman_home_id],
		 ghost_home = vertices[(ghost_home_id === '') ? null : +ghost_home_id];

	if (!pacman_home) { alert('Please enter a vertex id to use as pacmans home'); }
	else if (!ghost_home) { alert('Please enter a vertex id to use as the ghosts home'); }
	else {
		$.ajax('/api/map/create', {
			type: 'POST',
			dataType: 'json',
			data: {
				id: $('#name').val(),
				vertices: vertices,
				edges: edges,
				pacman_home: pacman_home,
				ghost_home: ghost_home
			},
			success: function(data) {
				if (!data.error) {
					window.location = window.location.protocol + '//' + window.location.host + '/create_game';
				}
				else {
					alert('error creating map'); console.log(data.error);
				}
			}
		});
	}

	evt.preventDefault();
});