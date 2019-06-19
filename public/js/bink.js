let currentHowl = null;
let lastOpenMarker = null;
let currentTimer = null;

$.ajaxSetup({
  cache: true
});

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
  $("#playButton").click(playCurrentHowl);
  $("#stopButton").click(stopCurrentHowl);
  $("#pauseButton").click(pauseCurrentHowl);
  // $("#nextButton").click(nextCurrentHowl);
  // $("#prevButton").click(prevCurrentHowl);

	if (location.hash == "#browse") {
		loadBrowse();
	} else if (location.hash == "#history") {
		loadHistoricJams();
	} else if (location.hash == "#map") {
		loadMap();
	} else if (location.hash == "#tweets") {
		loadTweets();
	} else if (location.hash.indexOf("#jam-") == 0) {
		let jamid = location.hash.split("-")[1];
		loadJam(jamid);
	} else {
		loadRecentJams();
	}

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
		editJam(msg.id);
	}).fail(function(jqXHR) { //failure connecting or similar
		binkAlert("Error occurred while creating jam. Error was: " + jqXHR.responseText);
	});
}

function loadBrowse() {
	$('.nav-link.active').removeClass('active');
	$('#browseButton').addClass('active');
  location.hash = "browse";

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
      $(window).scrollTop(0);
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
	let html = "";
	html += '<a href="javascript:" class="nav-link" id="adminButton">Admin</a>';
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
	let sendThem = {
		password : $("#password").val()
	}

	$.ajax({
		method : "POST",
		url : "/admin/login",
		contentType : "application/json",
		data : JSON.stringify(sendThem)
	}).done(function(msg) {
		let data = JSON.parse(msg)
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

function playImmediately(setTitle, path) {
	console.log("Title: " + setTitle)
	console.log("Path: " + path)
  $("#currentlyPlaying").text(`${setTitle}`);
  if (currentHowl !== null) {
    currentHowl.stop();
    currentHowl.unload();
    currentHowl = null;
  }
  currentHowl = new Howl({
    html5: true,
    preload: true,
    autoplay: true,
    src: [path]
  })
  playCurrentHowl();
}

function updatePosition() {
  var seekTime = currentHowl.seek();
  var currentPosition = formatSecondsIntoTime(Math.round(seekTime));
  var duration = currentHowl.duration();
  var durationTime = formatSecondsIntoTime(Math.round(duration));
  $('#currentPosition').html(`${currentPosition} / ${durationTime}`)
}

function formatSecondsIntoTime(secs) {
  var minutes = Math.floor(secs / 60) || 0;
  var seconds = (secs - minutes * 60) || 0;

  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function playCurrentHowl() {
  if (currentHowl && ! currentHowl.playing()) {
    currentHowl.play();
    $("#pauseButton").removeClass("disabled");
    $("#playButton").addClass("disabled");
    currentTime = setInterval(updatePosition, 500);
  } if (currentHowl && currentHowl.playing()) {
    console.log(`Cannot play because the howl is currently playing.`);
  } else {
    console.log(`Cannot play because: ${currentHowl}`);
  }
}

function stopCurrentHowl() {
  if (currentHowl) {
    $("#pauseButton").addClass("disabled");
    $("#playButton").removeClass("disabled");
    currentHowl.stop();
    clearInterval(currentTimer);
    $('#currentPosition').html('0:00 / 0:00')
  } else {
    console.log(`Cannot stop because: ${currentHowl}`);
  }
}

function pauseCurrentHowl() {
  if (currentHowl) {
    $("#pauseButton").addClass("disabled");
    $("#playButton").removeClass("disabled");
    currentHowl.pause();
    clearInterval(currentTimer);
  } else {
    console.log(`Cannot pause because: ${currentHowl}`);
  }
}

function recentCallback(data) {
	$.get('/views/recent', function(view) {
		$('#main').html(view);
    $(window).scrollTop(0);
	})
}


function loadEntity(type, id) {
	$('.nav-link.active').removeClass('active');
	$.get(`/views/entity/${type}/${id}`, function(view) {
		$('#main').html(view);
    if (type === "locations") {
      $.get(`/api/entity/locations/${id}`, function(location) {
        if (location.lat && location.lon) {
          loadMapsAPI(function() {
            mapLocation(location);
          })
        }
      })
    }
		$.getScript('https://cdnjs.cloudflare.com/ajax/libs/bootstrap-table/1.12.1/bootstrap-table.min.js',
			function(data, status, jqXhr) {
			$('#entityJamTable').bootstrapTable({
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
				url: `/api/entity/${type}/${id}/search`,
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
      $(window).scrollTop(0);
		})
	})
}

function loadRecentJams() {
	$('.nav-link.active').removeClass('active');
	$('#recentButton').addClass('active');
	$("#main").html("Loading...")
  location.hash = "recent";
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
  location.hash = "history";
	$.get("/views/history", function(view) {
		$('#main').html(view);
    $(window).scrollTop(0);
	});
}

let infowindow = null;
function loadMap() {
  $('.nav-link.active').removeClass('active');
  $('#mapButton').addClass('active');
  location.hash = "map";
  $("#main").html("Loading...")
	loadClustererAPI(function() {
		let coordinates = new google.maps.LatLng(39.944465, -97.350595);
		let mapOptions = {
			center : coordinates,
			zoom : 5
		}
		$('#main').html('<div class="position-absolute w-100 h-100" id="map-canvas"></div>');
		let map = new google.maps.Map($("#map-canvas")[0], mapOptions);
    $.get('/api/maplocations', function(data) {
      let markers = [];
      data.forEach(function(thislocation) {
        let thiscoordinates = new google.maps.LatLng(
          thislocation.lat, thislocation.lon
        );
        let thismarker = new google.maps.Marker({
          position: thiscoordinates
        });
        thismarker.addListener('click', function(event) {
          if (infowindow)
    				infowindow.close();
    			infowindow = new google.maps.InfoWindow();
    			$.get(`/views/infowindow/${thislocation.id}`, function(html) {
            infowindow.setContent(html);
      			infowindow.open(map, thismarker);
          })
        })
        markers.push(thismarker);
      })
      let mcOptions = {
        imagePath: '/img/m'
      };
      let markercluster = new MarkerClusterer(map, markers, mcOptions);
    })

  })
}


function loadJam(id) {
	location.hash = "jam-" + id;
	$('.nav-link.active').removeClass('active');
	$.get(`/views/jam/${id}`, function(view) {
		$('#main').html(view);
    $('#deleteJamButton').click(deleteJam);
    $('#editJamButton').click(function() {
      editJam(id);
    });
		$.get(`/api/jam/${id}/location`, function(loc) {
      if (loc.lat && loc.lon) {
        loadMapsAPI(function() {
  				mapLocation(loc);
  			})
        $(window).scrollTop(0);
      }
		})
	})
}

function deleteJam() {
  var id = $('#jamid').data('id');
  $.ajax({
		method : "DELETE",
		url : `/admin/jam/${id}`,
		contentType : "application/json"
	}).done(function(msg) {
    $('#alertTitle').html('Deleted')
  	$('#alertText').html(`Successfully deleted jam #${id}!`)
  	$('#alertModal').modal('show');
    $('#alertModal').on('hide.bs.modal', function(e) {
      loadRecentJams();
    })
	}).fail(function(jqXHR) { //failure connecting or similar
		binkAlert("Error occurred while deleting jam. Error was: " + jqXHR.responseText);
	});
}

function editJam(id) {
	location.hash = "edit-" + id;
	$('.nav-link.active').removeClass('active');
	$.get(`/views/jam/edit/${id}`, function(view) {
		$('#main').html(view);
    $('#deleteJamButton').click(deleteJam);
    $('#saveJamButton').click(saveJam);
    $('#cancelJamButton').click(cancelEditJam);
    $('#jamlocation').autoComplete({
      resolverSettings: {
        url: '/api/entity/search/locations'
      }
    })
    $('#jamlocation').on('autocomplete.select',
      function(event, item) {
        console.log(`Location selected: ${JSON.stringify(item)}`)
        $('#locid').attr('data-id', `${item.value}`);
      })
    $(window).scrollTop(0);
	})
}

function cancelEditJam() {
  var id = $('#jamid').data('id');
  loadJam(id);
}

function saveJam() {
  var id = $('#jamid').data('id');
  var mydate = Date.parse($('#date').val());
  var toSend = {
    date: $('#jamdate').val(),
    title: $('#jamtitle').val(),
  };

  $.ajax({
		method : "PUT",
		url : `/admin/jam/${id}`,
		contentType : "application/json",
    json: true,
    data: JSON.stringify(toSend)
	}).done(function(msg) {
    var id = $('#jamid').data('id');
    loadJam(id);
	}).fail(function(jqXHR) { //failure connecting or similar
		binkAlert("Error occurred while creating jam. Error was: " + jqXHR.responseText);
	});
}

function loadClustererAPI(callback) {
  loadMapsAPI(function() {
    if (this.hasOwnProperty('MarkerClusterer')) {
      callback();
    } else {
      $.getScript(`https://cdnjs.cloudflare.com/ajax/libs/js-marker-clusterer/1.0.0/markerclusterer_compiled.js`,
        function(script, textStatus, jqXhr) {
        callback();
      })
    }
  })
}

function loadMapsAPI(callback) {
	if (this.hasOwnProperty('google') && google.hasOwnProperty('maps')) {
		callback();
	} else {
		$.get("/api/maps/key", function(data) {
			$.getScript(`https://maps.googleapis.com/maps/api/js?key=${data}`,
				function(script, textStatus, jqXhr) {
					callback();
				})
		})
	}
}

function mapLocation(loc) {
	let coordinates = new google.maps.LatLng(parseFloat(loc.lat),
			parseFloat(loc.lon));
	let mapOptions = {
		center : coordinates,
		zoom : 9
	}
	let map = new google.maps.Map($('#map-canvas')[0],
			mapOptions);
	let marker = new google.maps.Marker({
		position : coordinates,
		map : map,
		title : location.name
	});
}
