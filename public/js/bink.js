let currentHowl = null;
let lastOpenMarker = null;
let currentTimer = null;
let currentMusician = -1;
let currentInstrument = -1;

$.ajaxSetup({
  cache: true
});

$( document ).ajaxError(function(event, request, settings, thrownError) {
  if (thrownError === "abort") {
    console.log(`The request was aborted because they continue to type.`)
  } else {
    $('#alertTitle').html('Error!')
  	$('#alertText').html(`An error occurred.`)
  	$('#alertModal').modal('show');
  }
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
  } else if (location.hash.indexOf("#edit-") == 0) {
		let jamid = location.hash.split("-")[1];
		editJam(jamid);
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

// fancy schmancy script loading stuff.
//
// pass an array of scriptNames, which will load views. but it also
// checks that the javascript is not only loaded on the page, but has
// finished executing; this is the checkLoaded() call.  we will async
// call checkLoaded until it comes back true and then we'll call you
// back.  checkLoaded() returns a boolean of variables that ought to
// be initialized before we can move on.
function loadScripts(scriptNames, checkLoaded, callback) {
  //only load the script if it isn't loaded yet
  scriptNames.forEach(function(scriptName) {
    //look for an existing script holder
    if ($(`#${scriptName}Holder`).length === 0) {
      //the holder does not exist; create it.
      $('#scriptHolders').append(`<div id='${scriptName}Holder'></div>`);
    }
    //separately, we need to check if the holder has a script in it.
    if ($(`#${scriptName}Holder`).html() === "") {
      //grab the script holder from the views
      $.get(`/views/scriptHolders/${scriptName}`, function(view) {
        //put the script(s) in an element on the page
        $(`#${scriptName}Holder`).html(view);
      }) //load the scriptholder view
    }
  })

  //call checkloaded super often to see if we're done
  var waitForExecution = setInterval(function() {
    if (checkLoaded()) {
      clearInterval(waitForExecution); //we're done; clear the interval
      callback(); //things are ready; resume life
    }
  }, 50); //checkloaded
}

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

function bootstrapTableLoaded() {
  return (typeof $().bootstrapTable === "function");
}


function loadBrowse() {
	$('.nav-link.active').removeClass('active');
	$('#browseButton').addClass('active');
  location.hash = "browse";

	$.get('/views/browse', function(view) {
		$('#main').html(view);
		loadScripts(['bootstrapTable'], bootstrapTableLoaded, function() {
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
			}); //bootstrapTable init
      $(window).scrollTop(0);
    }) //loadScript + callback
	}) //.get the browse view
} //loadBrowse()

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
    $('#adminItem').html(view);
    $('#adminItem').addClass('dropdown');
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
    console.log(`Cannot play because: ${JSON.stringify(currentHowl)}`);
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
    console.log(`Cannot stop because: ${JSON.stringify(currentHowl)}`);
  }
}

function pauseCurrentHowl() {
  if (currentHowl) {
    $("#pauseButton").addClass("disabled");
    $("#playButton").removeClass("disabled");
    currentHowl.pause();
    clearInterval(currentTimer);
  } else {
    console.log(`Cannot pause because: ${JSON.stringify(currentHowl)}`);
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
          loadScripts(['googleMaps'], itemMapScriptsLoaded, function() {
            mapLocation(location);
          }); //load the google maps API.
        } //only load maps if item has lat and lon
      }) //if we're looking at a location, see if it has a lat & lon
    }
		loadScripts(['bootstrapTable'], bootstrapTableLoaded, function() {
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
			}); //end bootstrapTable definition
      $(window).scrollTop(0);
		}) //loadScript call
	}) //get /type/id
} //load entity

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

function overviewMapScriptsLoaded() {
  return (typeof google === "object" &&
          typeof google.maps === "object" &&
          typeof google.maps.Map === "function" &&
          typeof MarkerClusterer === "function"
        );
}

function itemMapScriptsLoaded() {
  return (typeof google === "object" &&
          typeof google.maps === "object" &&
          typeof google.maps.Map === "function"
        );
}

let infowindow = null;
function loadMap() {
  $('.nav-link.active').removeClass('active');
  $('#mapButton').addClass('active');
  location.hash = "map";
  $("#main").html("Loading...")
  loadScripts(['googleMaps', 'markerClusterer'], overviewMapScriptsLoaded, function() {
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
      })  //populate the map with markers
      let mcOptions = {
        imagePath: '/img/m'
      };
      let markercluster = new MarkerClusterer(map, markers, mcOptions);
    }) //grap the map locations
  }) //grap the scripts
} //loadMap()


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
        loadScripts(['googleMaps'], itemMapScriptsLoaded, function() {
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

function deleteTrack(trackid) {
  var jamid = $('#jamid').data('id');
  $.ajax({
		method : "DELETE",
		url : `/admin/jam/${jamid}/tracks/${trackid}`,
		contentType : "application/json"
	}).done(function(msg) {
    reloadTracks(jamid);
	}).fail(function(jqXHR) { //failure connecting or similar
		binkAlert("Error occurred while deleting track. Error was: " + jqXHR.responseText);
	});
}

function reloadTracks(id, focus) {
  $.get(`/views/admin/jam/${id}/edit/tracks`, function(tracksView) {
    $('#tracksHolder').html(tracksView);
    loadTracksTable();
    var theZone = new Dropzone('#theZone', {
      url: '/api/files/upload'
    });
  })
}

function syncMedia(type) {
  var id = $('#jamid').data('id');
  $.ajax({
		method : "POST",
		url : `/admin/jam/${id}/sync/${type}`,
		contentType : "application/json"
	}).done(function(msg) {
    reloadTracks(id);
	}).fail(function(jqXHR) { //failure connecting or similar
		binkAlert("Error occurred while synchronizing tracks. Error was: " + jqXHR.responseText);
	});
}

function stripTrackNumbers() {
  var id = $('#jamid').data('id');
  $.ajax({
		method : "POST",
		url : `/admin/jam/${id}/stripTrackNumbers`,
		contentType : "application/json"
	}).done(function(msg) {
    reloadTracks(id);
	}).fail(function(jqXHR) { //failure connecting or similar
	  binkAlert("Error occurred while stripping track numbers. Error was: " + jqXHR.responseText);
	});
}

function reloadMusicians(id, focus) {
  $.get(`/views/admin/jam/${id}/edit/musicians`, function(musicianView) {
    $('#musicianHolder').html(musicianView)

    //Setup musician autocomplete
    $('#addmusician').autoComplete({
      resolverSettings: {
        url: '/api/entity/search/musicians'
      }
    })

    //when the user selects a musician
    $('#addmusician').on('autocomplete.select',
      function(event, item) {
        checkAddMusicianForm();
    })

    //When the user creates a new musician
    $('#addmusician').on('autocomplete.freevalue', addNewMusician)

    //Setup instrument autocomplete
    $('#addinstrument').autoComplete({
      resolverSettings: {
        url: '/api/entity/search/instruments'
      }
    })

    //when the user selects an instrument
    $('#addinstrument').on('autocomplete.select',
      function(event, item) {
        checkAddMusicianForm();
    })

    //When the user creates a new instrument
    $('#addinstrument').on('autocomplete.freevalue', addNewInstrument)

    if (focus) {
      $('#addmusician').focus();
    }
  })
}

function reloadStaff(id, focus) {
  $.get(`/views/admin/jam/${id}/edit/staff`, function(staffView) {
    $('#staffHolder').html(staffView)

    //Setup staff autocomplete
    $('#addstaff').autoComplete({
      resolverSettings: {
        url: '/api/entity/search/staff'
      }
    })

    //when the user selects a staff
    $('#addstaff').on('autocomplete.select',
      function(event, item) {
        checkAddStaffForm();
    })

    //When the user creates a new staff
    $('#addstaff').on('autocomplete.freevalue', addNewStaff)

    //Setup role autocomplete
    $('#addrole').autoComplete({
      resolverSettings: {
        url: '/api/entity/search/roles'
      }
    })

    //when the user selects a role
    $('#addrole').on('autocomplete.select',
      function(event, item) {
        checkAddStaffForm();
    })

    //When the user creates a new role
    $('#addrole').on('autocomplete.freevalue', addNewRole)

    if (focus) {
      $('#addstaff').focus();
    }
  })
}

function setJamVisibility() {
  var id = $('#jamid').data('id');
  var toSend = {
    private: $('#isJamPrivate').prop('checked')
  }

  $.ajax({
		method : "PUT",
		url : `/admin/jam/${id}/private`,
		contentType : "application/json",
    json: true,
    data: JSON.stringify(toSend),
    error: function(jqXHR) { //failure connecting or similar
		   binkAlert("Error occurred while setting jam visibility. Error was: " + jqXHR.responseText);
    } //end of error function
  }); //end of ajax call
}


function momentjsLoaded() {
  return (typeof moment === "function");
}

function editJamScriptsLoaded() {
  var bootstrapAutocompleteLoaded = (typeof $().autoComplete === "function");
  var tempusDominusLoaded = false;
  if (momentjsLoaded())
    tempusDominusLoaded = (typeof $().datetimepicker === "function");
  var dropzoneUploaded = (typeof Dropzone === "function");

  return (momentjsLoaded() &&
          tempusDominusLoaded &&
          bootstrapAutocompleteLoaded &&
          dropzoneUploaded);
}

function editJam(id) {
	location.hash = "edit-" + id;
	$('.nav-link.active').removeClass('active');
  loadScripts(['moment'], momentjsLoaded, function() {
    loadScripts(['bootstrapAutocomplete', 'dropzone', 'tempusDominus'],
      editJamScriptsLoaded, function() {
      $.get(`/views/admin/jam/edit/${id}`, function(view) {
    		$('#main').html(view);
        reloadMusicians(id);
        reloadStaff(id);
        reloadTracks(id);
        $('#deleteJamButton').click(deleteJam);
        $('#saveJamButton').click(saveJam);
        $('#cancelJamButton').click(cancelEditJam);
        $('#isJamPrivate').click(setJamVisibility);

        $(window).scrollTop(0);

        //Setup location autocomplete
        $('#jamlocation').autoComplete({
          resolverSettings: {
            url: '/api/entity/search/locations'
          }
        })

        //When the user selects a location
        $('#jamlocation').on('autocomplete.select',
          function(event, item) {
            if (typeof item !== "undefined") {
              $('#locid').attr('data-id', `${item.value}`);
            }
        })

        //When the user adds a new location
        $('#jamlocation').on('autocomplete.freevalue', addNewLocation)

        //Setup band autocomplete
        $('#jamband').autoComplete({
          resolverSettings: {
            url: '/api/entity/search/bands'
          }
        })

        //when the user selects a band
        $('#jamband').on('autocomplete.select',
          function(event, item) {
            if (typeof item !== "undefined") {
              $('#bandid').attr('data-id', `${item.value}`);
            }
        })

        //When the user adds a new band
        $('#jamband').on('autocomplete.freevalue', addNewBand)
    	})
    })
  })
}


function trackActionsFormatter(value, row) {
  return `<a href='javascript:playImmediately("${row.title}", "${row.path}")';>` +
          `<i class="fa fa-play mr-1"></i></a>` +
          `<a href='javascript:deleteTrack(${value})';>` +
          `<i class="far fa-trash-alt mr-1"></i></a>` +
          `<a href='${row.path}';>` +
          `<i class="fas fa-download"></i></a>`;
}

function loadTracksTable() {
  var jamid = $('#jamid').data('id');
  loadScripts(['bootstrapTable'], bootstrapTableLoaded, function() {
    $('#trackTable').bootstrapTable({
      columns: [
        {field:'num',
          title:'#',
          width: '5',
          sortable: true,
          order: 'desc'},
        {field:'title',
          title:'Title'},
        {field: 'id',
          width: '5',
          title: 'Actions',
          formatter: trackActionsFormatter}
      ],
      url: `/admin/jam/${jamid}/tracks`,
      pagination: false,
      search: false,
      showRefresh: true,
      showColumns: true,
      buttons: {
        btnStripTracks: {
          text: 'Strip Tracks',
          icon: 'fas fa-broom',
          event: stripTrackNumbers,
          attributes: {
            title: 'Strip the tracks of their extension and ordering prefix'
          }
        },
        btnSyncTracks: {
          text: 'Sync Tracks',
          icon: 'fa-phone-alt',
          event: function() {
            syncMedia('snd');
          },
          attributes: {
            title: 'Synchronize track listing with what has been uploaded'
          } //synctracks attributes
        } //synctracks definition
      } //buttons definition
    }) //bootstrapTable call
  }) //loadScripts call
} //loadTracks()

//STAFF ACTIONS
function removeStaffRole(staffid, roleid) {
  var id = $('#jamid').data('id');
  $.ajax({
		method : "DELETE",
		url : `/admin/jam/${id}/staff/${staffid}/roles/${roleid}`,
    success: function(msg) {
      reloadStaff(id);
    }
	});
}

function removeEntireStaff(staffid) {
  var id = $('#jamid').data('id');
  $.ajax({
    method : "DELETE",
    url : `/admin/jam/${id}/staff/${staffid}/all`,
    success: function(msg) {
      reloadStaff(id);
    }
  });
}

function checkAddStaffForm() {
  var staffid = $('[name="addstaff"]').val();
  var roleid = $('[name="addrole"]').val();
  if (staffid > 0 && roleid > 0) {
    var id = $('#jamid').data('id');
    addStaffToJam(id, staffid, roleid);
  }
}

function addStaffToJam(jamid, staffid, roleid) {
  var toSend = {
    staffid: staffid,
    roleid: roleid
  }

  $.ajax({
    method : "POST",
    url : `/admin/jam/${jamid}/staff`,
    contentType : "application/json",
    json: true,
    data: JSON.stringify(toSend),
    success: function(msg) {
      reloadStaff(jamid, true);
    }
  });
}

function addNewStaff(event, item) {
  showConfirmModal(
    `Are you sure you'd like to create the staff member "${item}" and select them for this jam?`,
  function() {
    $('#confirmModal').modal('hide');
    createEntity("staff", item, function(reply) {
      $('#addstaff').autoComplete('set', { value: reply.id, text: reply.name });
      checkAddStaffForm();
    });
  })
}

function addNewRole(event, item) {
  showConfirmModal(
    `Are you sure you'd like to create the role "${item}" and select it for this jam?`,
  function() {
    $('#confirmModal').modal('hide');
    var staffid = $('[name="addstaff"]').val();
    var jamid = $('#jamid').data('id');
    createEntity("roles", item, function(reply) {
      if (staffid) {
        addStaffToJam(jamid, staffid, reply.id);
      } else {
        $('#addrole').autoComplete('set', { value: reply.id, text: reply.name });
      }
    });
  })
}

//MUSICIAN ACTIONS
function removeMusicianInstrument(musicianid, instrumentid) {
  var id = $('#jamid').data('id');
  $.ajax({
		method : "DELETE",
		url : `/admin/jam/${id}/musicians/${musicianid}/instruments/${instrumentid}`,
    success: function(msg) {
      reloadMusicians(id);
    }
	});
}

function removeEntireMusician(musicianid) {
  var id = $('#jamid').data('id');
  $.ajax({
    method : "DELETE",
    url : `/admin/jam/${id}/musicians/${musicianid}/all`,
    success: function(msg) {
      reloadMusicians(id);
    }
  });
}

function checkAddMusicianForm() {
  var musicianid = $('[name="addmusician"]').val();
  var instrumentid = $('[name="addinstrument"]').val();
  if (musicianid > 0 && instrumentid > 0) {
    var id = $('#jamid').data('id');
    addMusicianToJam(id, musicianid, instrumentid);
  }
}

function addMusicianToJam(jamid, musicianid, instrumentid) {
  var toSend = {
    musicianid: musicianid,
    instrumentid: instrumentid
  }

  $.ajax({
    method : "POST",
    url : `/admin/jam/${jamid}/musicians`,
    contentType : "application/json",
    json: true,
    data: JSON.stringify(toSend),
    success: function(msg) {
      reloadMusicians(jamid, true);
    }
  });
}

function addNewMusician(event, item) {
  showConfirmModal(
    `Are you sure you'd like to create the musician "${item}" and select them for this jam?`,
  function() {
    $('#confirmModal').modal('hide');
    createEntity("musicians", item, function(reply) {
      $('#addmusician').autoComplete('set', { value: reply.id, text: reply.name });
      checkAddMusicianForm();
    });
  })
}

function addNewInstrument(event, item) {
  showConfirmModal(
    `Are you sure you'd like to create the instrument "${item}" and select it for this jam?`,
  function() {
    $('#confirmModal').modal('hide');
    var musicianid = $('[name="addmusician"]').val();
    var jamid = $('#jamid').data('id');
    createEntity("instruments", item, function(reply) {
      if (musicianid) {
        addMusicianToJam(jamid, musicianid, reply.id);
      } else {
        $('#addinstrument').autoComplete('set', { value: reply.id, text: reply.name });
      }
    });
  })
}

function addNewLocation(event, item) {
  showConfirmModal(
    `Are you sure you'd like to create the location "${item}" and select it for this jam?`,
  function() {
    $('#confirmModal').modal('hide');
    createEntity("locations", item, function(reply) {
      $('#locid').attr('data-id', `${reply.id}`);
      $('#jamlocation').autoComplete('set', { value: reply.id, text: reply.name });
    });
  })
}

function addNewBand(event, item) {
  showConfirmModal(
    `Are you sure you'd like to create the band "${item}" and select it for this jam?`,
  function() {
    $('#confirmModal').modal('hide');
    createEntity("bands", item, function(reply) {
      $('#bandid').attr('data-id', `${reply.id}`);
      $('#jamband').autoComplete('set', { value: reply.id, text: reply.name });
    });
  })
}

function createEntity(type, incomingName, callback) {
  var toSend = {
    name: incomingName
  }

  $.ajax({
    method : "POST",
    url : `/admin/entity/${type}`,
    contentType : "application/json",
    json: true,
    data: JSON.stringify(toSend),
    success: function(msg) {
      callback(msg);
    }
  });
}

function showConfirmModal(message, yesFunction) {
  $.get("/views/admin/confirmModal").done(function(view) {
    $('#main').append(view);
    $('#confirm-text').text(message)
    $('#yesButton').off();
    $('#yesButton').click(function() {
      if (yesFunction) {
        yesFunction();
      }
    })
    $('#confirmModal').modal('show', { keyboard:true});
  }) //get the confirmation modal
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
    locid: $('#locid').data('id'),
    bandid: $('#bandid').data('id'),
    notes: $('#jamnotes').val()
  };

  $.ajax({
		method : "PUT",
		url : `/admin/jam/${id}`,
		contentType : "application/json",
    json: true,
    data: JSON.stringify(toSend),
    success: function(msg) {
      var id = $('#jamid').data('id');
      loadJam(id);
    },
    error: function(jqXHR) { //failure connecting or similar
		   binkAlert("Error occurred while creating jam. Error was: " + jqXHR.responseText);
    }
  });
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
