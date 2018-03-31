var lastOpenMarker = null;

$( document ).ajaxError(function(event, request, settings) {
	$('#alertTitle').html('Error!')
	$('#alertText').html(`An error occurred.`)
	$('#alertModal').modal('show');
});


$(document).ready(function() {
	$("a#recentButton").click(loadRecentJams)
	$("a#browseButton").click(loadBrowse)
	$("a#historyButton").click(loadHistoricJams)
	$("a#mapButton").click(loadMap)

	if (location.hash == "#browse") {
		loadBrowse();
	} else if (location.hash == "#history") {
		loadHistoricJams();
	} else if (location.hash == "#map") {
		loadMap();
	} else if (location.hash == "#tweets") {
		loadTweets();
	} else if (location.hash.indexOf("#jam-") == 0) {
		var jamid = location.hash.split("-")[1];
		loadJam(jamid);
	} else {
		loadRecentJams();
	}

	$("#jquery_jplayer_1").jPlayer({
		cssSelectorAncestor : "#jp_container_1",
		swfPath : "/js",
		supplied : "mp3",
		useStateClassSkin : true,
		autoBlur : false,
		smoothPlayBar : true,
		keyEnabled : true,
		remainingDuration : true,
		toggleDuration : true
	});

	$("#logoutButton").click(logout);
	$("#loginButton").click(login);
	$("a#adminButton").click(function() {
		$('#password').val('');
		$('#adminModal').modal('show');
	})

	$.get("/admin/loggedin").done(function(data) {
		if (data.admin) {
			showAdmin();
		}
		else {
			hideAdmin();
		}
	}) //get logged in
}) //document.ready

function createNew() {
	$.ajax({
		method : "POST",
		url : "/admin/jam",
		contentType : "application/json"
	}).done(function(msg) {
		var data = JSON.parse(msg)
		console.log(data);
	}).fail(function(jqXHR) { //failure connecting or similar
		binkAlert("Error occurred while creating jam. Error was: " + jqXHR.responseText);
	});
}

function loadBrowse() {
	$('.nav-link.active').removeClass('active');
	$('#browseButton').addClass('active');

	$.get('/views/browse', function(view) {
		$('#main').html(view);
		$.getScript('https://cdnjs.cloudflare.com/ajax/libs/bootstrap-table/1.12.1/bootstrap-table.min.js',
			function(data, status, jqXhr) {
			$('#jamTable').bootstrapTable({
				columns: [
					{field:'date',
						title:'Date',
						sortable: true,
						order: 'desc',
						formatter: dateFormatter},
					{field:'title',
							title:'Title',
						formatter: titleFormatter},
					{field:'location.name',
						title:'Location',
						formatter: locationFormatter},
					{field:'band.name',
						title:'Band',
						formatter: bandFormatter},
					{field:'hasTracks',
						title:'Tracks',
						formatter: hasTracksFormatter},
					{field:'hasPics',
						title:'Pics',
						formatter: hasPicsFormatter},
					{field:'hasVids',
						title:'Vids',
						formatter: hasVidsFormatter},
					{field:'private',
						title:'Private',
						formatter: privateFormatter}
				],
				url: '/api/search',
				sidePagination: 'server',
				pagination: true,
				search: true,
				showRefresh: true,
				showColumns: true,
				pageList: [3,5,10,20,50,100],
				sortOrder: 'desc',
				icons: {
					refresh: 'fas fa-sync',
					columns: 'fas fa-columns'
				}
			});
		})
	})
}

function privateFormatter(value, row) {
	if (row.private) {
		return '<i class="fas fa-key"></i>';
	} else {
		return '-';
	}
}

function locationFormatter(value, row) {
	if (row.location) {
		return `<a href="javascript:loadEntity('locations', ${row.location.id})">${value}</a>`;
	} else {
		return '-'
	}
}

function bandFormatter(value, row) {
	if (row.band) {
		return `<a href="javascript:loadEntity('bands', ${row.band.id})">${value}</a>`;
	} else {
		return '-';
	}
}

function titleFormatter(value, row) {
	return `<a href="javascript:loadJam(${row.id})">${value}</a>`;
}

function dateFormatter(value) {
	let d = new Date(value);
	return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

function hasTracksFormatter(value) {
	if (value === true) {
    return '<i class="fas fa-music"></i>';
  } else {
		return '';
	}
  return value;
}

function hasPicsFormatter(value) {
	if (value === true) {
    return '<i class="fas fa-camera"></i>';
  } else {
		return '';
	}
  return value;
}

function hasVidsFormatter(value) {
	if (value === true) {
    return '<i class="fas fa-video"></i>';
  } else {
		return '';
	}
  return value;
}

function showAdmin()
{
	$.get('/views/admin/dropdown', function(view) {
		$('#adminItem').addClass('dropdown');
		$('#adminItem').html(view);
		$("#logoutButton").click(logout);
		$('#newButton').click(createNew);
	})
}

function hideAdmin()
{
	$('#adminItem').removeClass('dropdown');
	var html = "";
	html += '<a class="nav-link linkish" id="adminButton">Admin</a>';
	$('#adminItem').html(html);
	$('#modalAlert').html('');

	$("a#adminButton").click(showLoginModal);
}

function logout()
{
	$.ajax({
		method : "PUT",
		url : "/admin/logout"
	}).done(function(msg) {
		hideAdmin();
		loadRecentJams();
	});
}

function login() {
	var sendThem = {
		password : $("#password").val()
	}

	$.ajax({
		method : "POST",
		url : "/admin/login",
		contentType : "application/json",
		data : JSON.stringify(sendThem)
	}).done(function(msg) {
		var data = JSON.parse(msg)
		if (data.valid) {
			$('#loginModal').modal('hide');
			showAdmin();
			loadRecentJams();
		} else // invalid password
		{
			$('#alert-container').children().remove();
			$('#alert-container').append('<div class="alert alert-primary" role="alert">Incorrect password! Try again!</div>')
			$('#password').val('');
			$('#password').focus();
		}
	}).fail(function(jqXHR) { //failure connecting or similar
		$('#alert-container').children().remove();
		$('#alert-container').append(`<div class="alert alert-primary" role="alert">Error occurred while logging in: ${jqXHR.responseText}</div>`)
		$('#password').val('');
		$('#password').focus();
	});
}

function showLoginModal() {
	$.get('/views/loginModal', function(view) {
		$('#main').append(view);
		$('#loginModal').modal('show', { keyboard:true});
		$('#loginButton').click(login);
		$('#password').focus();
		$("INPUT#password").keypress(function(event) {
			if (event.keyCode == 13 || event.which == 13) {
					event.preventDefault();
					login();
			}
		})
	})
}

function play(setTitle, path) {
	console.log("Title: " + setTitle)
	console.log("Path: " + path)
	$("#jquery_jplayer_1").jPlayer("setMedia", {
		title : setTitle,
		mp3 : path
	});
	$("#jquery_jplayer_1").jPlayer("play")
}

function recentCallback(data) {
	$.get('/views/recent', function(view) {
		$('#main').html(view);
	})
}


function loadEntity(type, id) {
	$('.nav-link.active').removeClass('active');
	$.get(`/views/entity/${type}/${id}`, function(view) {
		$('#main').html(view);
	})
}

// function loadMusician(id) {
// 	$('.nav-link.active').removeClass('active');
// 	$.get("/api/entity/musicians/" + id, function(data) {
// 		var html = "<h1>Musician: " + data.name + "</h1>"
// 		if (data.link != null && data.link.indexOf("http") == 0) {
// 			html += "Website: <a target='_blank' href='" + data.link + "'>"
// 					+ data.link + "</a>"
// 		}
// 		html += "<hr />Appears on collections: <ul>"
// 		for (var j = 0; j < data.jams.length; j++) {
// 			html += "<li><a href='javascript:loadJam(" + data.jams[j].id
// 					+ ")'>" + data.jams[j].title + "</a></li>"
// 		}
// 		html += "</ul>"
// 		$("#main").html(html)
// 	})
// }
//
// function loadStaff(id) {
// 	$('.nav-link.active').removeClass('active');
// 	$.get("/api/entity/staff/" + id, function(data) {
// 		var html = "<h1>Staff: " + data.name + "</h1>"
// 		html += "<hr />Appears on collections: <ul>"
// 		for (var j = 0; j < data.jams.length; j++) {
// 			html += "<li><a href='javascript:loadJam(" + data.jams[j].id
// 					+ ")'>" + data.jams[j].title + "</a></li>"
// 		}
// 		html += "</ul>"
// 		$("#main").html(html)
// 	})
// }
//
// function loadLocation(id) {
// 	$('.nav-link.active').removeClass('active');
// 	$
// 			.get(
// 					"/api/entity/locations/" + id,
// 					function(data) {
// 						var html = "<h1>Location: " + data.name + "</h1>"
// 						if (data.link != null && data.link.indexOf("http") == 0) {
// 							html += "Website: <a target='_blank' href='"
// 									+ data.link + "'>" + data.link + "</a>"
// 						}
// 						var hasMap = false
// 						if (data.lat != null && data.lon != null) {
// 							hasMap = true
// 							html += "<div id='map-canvas' style='width: 100%; height: 100%'></div>"
// 						}
// 						html += "<hr />Collections at this location: <ul>"
// 						for (var j = 0; j < data.jams.length; j++) {
// 							html += "<li><a href='javascript:loadJam("
// 									+ data.jams[j].id + ")'>"
// 									+ data.jams[j].title + "</a></li>"
// 						}
// 						html += "</ul>"
// 						$("#main").html(html)
// 						if (hasMap) {
// 							var coordinates = new google.maps.LatLng(
// 									parseFloat(data.lat), parseFloat(data.lon));
// 							var mapOptions = {
// 								center : coordinates,
// 								zoom : 9
// 							}
// 							var map = new google.maps.Map(document
// 									.getElementById('map-canvas'), mapOptions);
// 							var marker = new google.maps.Marker({
// 								position : coordinates,
// 								map : map,
// 								title : data.name
// 							});
// 						}
// 					})
// }

function loadRecentJams() {
	$('.nav-link.active').removeClass('active');
	$('#recentButton').addClass('active');
	$("#main").html("Loading...")
	$.get("/api/recent", recentCallback).fail(function() {
		binkAlert("Problem", "Could not load recent jams.")
	})
}

function binkAlert(title, alert) {
	$("#thisAlert").html(alert)
	$("#thisAlertTitle").html(title)
	$("#alertModal").modal('show')
}

function loadHistoricJams() {
	$('.nav-link.active').removeClass('active');
	$('#historyButton').addClass('active');
	$("#main").html("Loading...")
	$.get("/views/history", function(view) {
		$('#main').html(view);
	});
}

function loadMap() {
	loadMapsAPI(function() {
		var coordinates = new google.maps.LatLng(39.944465, -97.350595);
		var mapOptions = {
			center : coordinates,
			zoom : 5
		}
		$('#main').html('<div class="position-absolute w-100 h-100" id="map-canvas"></div>');
		var map = new google.maps.Map($("#map-canvas")[0], mapOptions);
		$.get("/api/mapdata", function(data) {
			$('.nav-link.active').removeClass('active');
			$('#mapButton').addClass('active');

			for (var j = 0; j < data.length; j++) {
				var coordinates = new google.maps.LatLng(parseFloat(data[j].lat),
						parseFloat(data[j].lon));
				var content = data[j].name
				if (null != data[j].jams) {
					content += "<hr />"
					for (var k = 0; k < data[j].jams.length; k++) {
						content += "<a href='javascript:loadJam("
								+ data[j].jams[k].id + ")'>"
								+ data[j].jams[k].title + "</a>"
						if (k != data[j].jams.length - 1)
							content += ", "
					}
				}
				dropMarker(coordinates, data[j].name, content, map)
			}
		})
	})
}

function dropMarker(coordinates, name, content, map) {
	var thismarker = new google.maps.Marker({
		position : coordinates,
		map : map,
		title : name
	});
	var thiswindow = new google.maps.InfoWindow({
		content : content
	})
	google.maps.event.addListener(thismarker, 'click', function() {
		if (lastOpenMarker != null)
			lastOpenMarker.close()
		thiswindow.open(map, thismarker);
		lastOpenMarker = thiswindow
	});
}

function loadJam(id) {
	location.hash = "jam-" + id;
	$('.nav-link.active').removeClass('active');
	$.get(`/views/jam/${id}`, function(view) {
		$('#main').html(view);
		$.get(`/api/jam/${id}/location`, function(loc) {
			loadMapsAPI(function() {
				mapLocation(loc);
			})
		})
	})
}

function loadMapsAPI(callback) {
	$.get("/api/maps/key", function(data) {
		$.getScript(`https://maps.googleapis.com/maps/api/js?key=${data}`,
			function(script, textStatus, jqXhr) {
				callback();
		})
	})
}

function mapLocation(loc) {
	var coordinates = new google.maps.LatLng(parseFloat(loc.lat),
			parseFloat(loc.lon));
	var mapOptions = {
		center : coordinates,
		zoom : 9
	}
	var map = new google.maps.Map($('#map-canvas')[0],
			mapOptions);
	var marker = new google.maps.Marker({
		position : coordinates,
		map : map,
		title : location.name
	});
}
