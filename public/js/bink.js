let currentHowl = null;
let currentTimer = null;

$.ajaxSetup({
  cache: true
});

$( document ).ajaxError(function(event, request, settings, thrownError) {
  if (thrownError === "abort") {
    console.warn(`Request aborted; continuing to type.`)
  } else {
    binkAlert(`Server Error`, `The error is: ${thrownError}`);
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
	} else if (location.hash.indexOf("#jams-") == 0) {
		let jamid = location.hash.split("-")[1];
		loadJam(jamid);
  } else if (location.hash.indexOf("#edit-") == 0) {
		let jamid = location.hash.split("-")[1];
		editJam(jamid);
  } else if (location.hash.indexOf("#musicians-") == 0) {
    let musicianId = location.hash.split("-")[1];
    loadEntity("musicians", musicianId);
  } else if (location.hash.indexOf("#locations-") == 0) {
    let locationId = location.hash.split("-")[1];
    loadEntity("locations", locationId);
  } else if (location.hash.indexOf("#bands-") == 0) {
    let bandId = location.hash.split("-")[1];
    loadEntity("bands", bandId);
  } else if (location.hash.indexOf("#staff-") == 0) {
    let staffId = location.hash.split("-")[1];
    loadEntity("staff", staffId);
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
	})
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
    var myColumns = [{
      field:'date',
      title:'Date',
      sortable: true,
      order: 'desc',
      formatter: dateFormatter
    }, {
      field:'title',
      title:'Title',
      formatter: titleFormatter
    }, {
      field:'location.name',
      title:'Location',
      formatter: locationFormatter
    }, {
      field:'band.name',
      title:'Band',
      formatter: bandFormatter
    }, {
      field:'hasTracks',
      title:'Tracks',
      formatter: hasTracksFormatter
    }, {
      field:'hasPics',
      title:'Pics',
      formatter: hasPicsFormatter
    }, {
      field:'hasVids',
      title:'Vids',
      formatter: hasVidsFormatter
    }];

    if ($('#admin').data('admin')) {
      myColumns.push(privateColumn = {
        field:'private',
        title:'Private',
        formatter: privateFormatter
      });    
    }
    
		loadScripts(['bootstrapTable'], bootstrapTableLoaded, function() {
      $('#jamTable').bootstrapTable({
				columns: myColumns,
				url: '/api/search',
				sidePagination: 'server',
				pagination: true,
				search: true,
				showRefresh: true,
				showColumns: true,
				pageList: [3,5,10,20,50,100],
				sortOrder: 'desc',
				iconsPrefix: 'fa'
			}); //bootstrapTable init
      $(window).scrollTop(0);
    }) //loadScript + callback
	}) //.get the browse view
} //loadBrowse()

function privateFormatter(value, row) {
	if (row.private) {
		return '<i class="fa-solid fa-key"></i>';
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
    return '<i class="fa-solid fa-music"></i>';
  } else {
		return '';
	}
  return value;
}

function hasPicsFormatter(value) {
	if (value === true) {
    return '<i class="fa-solid fa-camera"></i>';
  } else {
		return '';
	}
  return value;
}

function hasVidsFormatter(value) {
	if (value === true) {
    return '<i class="fa-solid fa-video"></i>';
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
	}).fail(function() { //failure connecting or similar
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
  } 
}

function stopCurrentHowl() {
  if (currentHowl) {
    $("#pauseButton").addClass("disabled");
    $("#playButton").removeClass("disabled");
    currentHowl.stop();
    clearInterval(currentTimer);
    $('#currentPosition').html('0:00 / 0:00')
  } 
}

function pauseCurrentHowl() {
  if (currentHowl) {
    $("#pauseButton").addClass("disabled");
    $("#playButton").removeClass("disabled");
    currentHowl.pause();
    clearInterval(currentTimer);
  }
}

function recentCallback(data) {
	$.get('/views/recent', function(view) {
		$('#main').html(view);
    $(window).scrollTop(0);
    $('.editJamButton').click(function() {
      editJam($(this).data('id'));
    })
    $('.viewJamButton').click(function() {
      loadJam($(this).data('id'));
    })
    $('.deleteJamButton').click(function() {
      deleteJam($(this).data('id'));
    })
	})
}


function loadEntity(type, id) {
	$('.nav-link.active').removeClass('active');
  location.hash = `${type}-${id}`;
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
				iconsPrefix: 'fa',
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
	$.get("/api/recent", recentCallback)
}

function binkAlert(title, alert) {
	$("#binkAlertText").html(alert)
	$("#binkAlertTitle").html(title)
	$("#binkAlertModal").modal('show')
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
          typeof google.maps.marker === 'object' &&
          typeof google.maps.marker.AdvancedMarkerElement === 'function' &&
          typeof markerClusterer === "object" &&
          typeof markerClusterer.MarkerClusterer === "function"
        );
}

function itemMapScriptsLoaded() {
  return (typeof google === "object" &&
          typeof google.maps === "object" &&
          typeof google.maps.Map === "function" &&
          typeof google.maps.marker === 'object' &&
          typeof google.maps.marker.AdvancedMarkerElement === 'function'
        );
}

let infowindow = null;
function loadMap() {
  $('.nav-link.active').removeClass('active');
  $('#mapButton').addClass('active');
  location.hash = "map";
  $("#main").html("Loading...")
  loadScripts(['googleMaps', 'markerClusterer'], overviewMapScriptsLoaded, function() {
		$('#main').html('<div class="position-absolute w-100 h-100" id="map-canvas"></div>');
		var map = new google.maps.Map($("#map-canvas")[0], {
			  center: {
          lat: 39.944465,
          lng: -97.350595
        },
			  zoom: 5,
        mapId: 'overviewMap',
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_TOP,
        }
		});
    $.get('/api/maplocations', function(data) {
      let markers = [];
      data.forEach(function(thislocation) {
        var thismarker = new google.maps.marker.AdvancedMarkerElement({
          position: {
            lat: thislocation.lat,
            lng: thislocation.lon
          }
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
      var markercluster = new markerClusterer.MarkerClusterer({map, markers});
    }) //grap the map locations
  }) //grap the scripts
} //loadMap()


function loadJam(id) {
	location.hash = "jams-" + id;
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

function deleteJam(id) {
  $.ajax({
		method : "DELETE",
		url : `/admin/jam/${id}`,
		contentType : "application/json"
	}).done(function(msg) {
    binkAlert(`Deleted`, `Successfully deleted jam ${id}!`);
    $('#binkAlertModal').on('hide.bs.modal', function(e) {
      loadRecentJams();
    })
	})
}


function trackTitleFormatter(value, row) {
  return `<input class='form-control form-control-sm track-title' id='track-title-${row.id}' data-track-id='${row.id}' value='${value}' onchange='trackChanged(this);' />`;
}

function trackNotesFormatter(value, row) {
  if (null === value) {
    value = "";
  }
  return `<input class='form-control form-control-sm track-notes' id='track-notes-${row.id}' data-track-id='${row.id}' value='${value}' onchange='trackChanged(this);' placeholder='Add notes to this track' />`;
}

function reloadTracksSection(id, focus) {
  var jamid = $('#jamid').data('id');
  loadScripts(['bootstrapTable'], bootstrapTableLoaded, function() {

    $('#tracksTable').bootstrapTable({
      columns: [
        {field:'num',
          title:'#',
          width: '5',
          sortable: true,
          order: 'desc'},
        {field:'title',
          title:'Title',
          formatter: trackTitleFormatter},
        {field: 'notes',
          title:'Notes',
          formatter: trackNotesFormatter},
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
      iconsPrefix: 'fa',
      buttons: {
        btnStripTracks: {
          text: 'Strip Tracks',
          icon: 'fa-solid fa-broom',
          event: stripTrackNumbers,
          attributes: {
            title: 'Strip the tracks of their extension and ordering prefix'
          }
        },
        btnSyncTracks: {
          text: 'Sync Tracks',
          icon: 'fa-solid fa-phone-alt',
          event: function() {
            syncMedia('tracks');
          },
          attributes: {
            title: 'Synchronize track listing with what has been uploaded'
          } //synctracks attributes
        } //synctracks definition
      } //buttons definition
    }) //bootstrapTable call
  }) //loadScripts call
}

function reloadDropZone(id) {
  $.get("/views/admin/dropzone/template", function(loadedPreviewTemplate) {
    var theZone = new Dropzone('#theZone', {
      url: `/admin/jam/${id}/files`,
      previewsContainer: "#filePreviews",
      createImageThumbnails: true,
      previewTemplate: loadedPreviewTemplate,
      uploadMultiple: true,
      parallelUploads: 10
    }); //define the drop zone

    theZone.on('completemultiple', function(files) {
      files.forEach(function(thisfile) {
        if (thisfile.status === "success") {
          $('.dz-success-mark', thisfile.previewElement).removeClass('invisible');
        } else if (thisfile.status === "error") {
          $('.dz-error-mark', thisfile.previewElement).removeClass('invisible');
        }
      })
    })
  }) //get the dropzone template
}

function vidChanged(element) {
  var elementToGetVIDID = $(element);
  var vidid = elementToGetVIDID.data('vid-id');

  var videoTitleJQ = $(`#vid-title-${vidid}`);
  var newTitle = videoTitleJQ.val();

  var videoNotesJQ = $(`#vid-notes-${vidid}`);
  var newNotes = videoNotesJQ.val();

  if (videoTitleJQ.data('previousTitle') !== newTitle ||
      videoNotesJQ.data('previousNotes') !== newNotes) {
    videoTitleJQ.data('previousTitle', newTitle);
    videoNotesJQ.data('previousNotes', newNotes);

    var jamid = $('#jamid').data('id');
    var toSend = {
      title: newTitle,
      notes: newNotes
    };

    $.ajax({
      method : "PUT",
      url : `/admin/jam/${jamid}/vid/${vidid}`,
      contentType : "application/json",
      json: true,
      data: JSON.stringify(toSend)
    });
  }
}

function vidTitleFormatter(value, row) {
  return `<input class='form-control form-control-sm vid-title' id='vid-title-${row.id}' data-vid-id='${row.id}' value='${value}' onchange='vidChanged(this);' />`;
}

function vidNotesFormatter(value, row) {
  if (null === value) {
    value = "";
  }
  return `<input class='form-control form-control-sm vid-notes' id='vid-notes-${row.id}' data-vid-id='${row.id}' value='${value}' onchange='vidChanged(this);' placeholder='Add notes to this track' />`;
}

function vidActionsFormatter(value, row) {
  return `<a href='javascript:deleteVid(${value})';>` +
          `<i class="far fa-trash-alt me-1"></i></a>` +
          `<a href='${row.path}';>` +
          `<i class="fa-solid fa-download"></i></a>`;
}

function deleteVid(vidid) {
  var jamid = $('#jamid').data('id');
  $.ajax({
		method : "DELETE",
		url : `/admin/jam/${jamid}/vid/${vidid}`,
		contentType : "application/json"
	}).done(function(msg) {
    $('#vidsTable').bootstrapTable('refresh');
	})
}

function reloadVidsSection(id, focus) {
  var jamid = $('#jamid').data('id');
  loadScripts(['bootstrapTable'], bootstrapTableLoaded, function() {
    $('#vidsTable').bootstrapTable({
      columns: [
        {field:'num',
          title:'#',
          width: '5',
          sortable: true,
          order: 'desc'},
        {field:'title',
          title:'Title',
          formatter: vidTitleFormatter},
        {field: 'notes',
          title:'Notes',
          formatter: vidNotesFormatter},
        {field: 'id',
          width: '5',
          title: 'Actions',
          formatter: vidActionsFormatter}
      ],
      url: `/admin/jam/${jamid}/vids`,
      pagination: false,
      search: false,
      showRefresh: true,
      showColumns: true,
      iconsPrefix: 'fa',
      buttons: {
        btnSyncTracks: {
          text: 'Sync Video',
          icon: 'fa-solid fa-phone-alt',
          event: function() {
            syncMedia('vids');
          },
          attributes: {
            title: 'Synchronize video listing with what has been uploaded'
          } //synctracks attributes
        } //synctracks definition
      } //buttons definition
    }) //bootstrapTable call
  }) //loadScripts call
} //reloadVidsSection

function syncMedia(type) {
  var id = $('#jamid').data('id');
  $.ajax({
		method : "POST",
		url : `/admin/jam/${id}/sync/${type}`,
		contentType : "application/json"
	}).done(function(msg) {
    if (type === "tracks") {
      $('#tracksTable').bootstrapTable('refresh');
    } else if (type === "pics") {
      reloadPicsSection(id);
    } else if (type === "vids") {
      $('#vidsTable').bootstrapTable('refresh');
    }
	})
}

function setDefaultPic(picId) {
  var jamid = $('#jamid').data('id');

  var toSend = {
    defpic: picId
  };

  $.ajax({
		method : "PUT",
		url : `/admin/jam/${jamid}/defpic`,
		contentType : "application/json",
    json: true,
    data: JSON.stringify(toSend),
    success: function(result) {
      reloadPicsSection(jamid);
    }
  });
}

function deletePic(picId) {
  var jamid = $('#jamid').data('id');
  $.ajax({
		method : "DELETE",
		url : `/admin/jam/${jamid}/pic/${picId}`,
    success: function(msg) {
      reloadPicsSection(jamid);
    }
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

function updateJam() {
  var id = $('#jamid').data('id');
  var mydate = Date.parse($('#date').val());

  var toSend = {
    date: $('#jamdate').val(),
    title: $('#jamtitle').val(),
    locid: $('#locid').data('id'),
    bandid: $('#bandid').data('id'),
    notes: $('#jamnotes').val(),
    private: $('#isJamPrivate').prop('checked')
  };

  $.ajax({
		method : "PUT",
		url : `/admin/jam/${id}`,
		contentType : "application/json",
    json: true,
    data: JSON.stringify(toSend),
  });
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
        reloadTracksSection(id);
        reloadPicsSection(id);
        reloadVidsSection(id);
        reloadDropZone(id);
        $('#deleteJamButton').click(function() {
          deleteJam(id);
        });
        $('#viewJamButton').click(function() {
          loadJam(id);
        });
        $('#isJamPrivate').click(updateJam);
        $('#jamdatepicker').on('change.datetimepicker', function(e) {
          if (e.hasOwnProperty('isInvalid') && ! e.isInvalid) {
            updateJam();
          } else {
            binkAlert(`Incorrect Date`, `Please select a valid date for the jam`);
          }
        });
        $('#jamtitle').change(function (e) {
          //change is the best event
          //not making a request every time you push a letter
          //but changes when you blur or push enter
          //
          //also making sure no requests if the title
          //hasn't actually changed!
          var jamtitle = $(this);
          var thistitle = jamtitle.val();
          if (jamtitle.data('lastone') !== thistitle) {
            jamtitle.data('lastone', thistitle);
            updateJam();
          }
        })

        $('#jamnotes').change(function (e) {
          //change is the best event
          //not making a request every time you push a letter
          //but changes when you blur or push enter
          //
          //also making sure no requests if the title
          //hasn't actually changed!
          var jamnotes = $(this);
          var thesenotes = jamnotes.val();
          if (jamnotes.data('lastone') !== thesenotes) {
            jamnotes.data('lastone', thesenotes);
            updateJam();
          }
        })


        $(window).scrollTop(0);


        /**
         * Jam location autoComplete
         */
        $('#jamlocation').autoComplete({})

        // This has all gotten rather manual due to
        // lack of compatibility with Bootstrap 5.
        //
        // We're having to hard-code the link between
        // the selected component and what's in the box.
        // Same goes for bands.

        // If this jam has a location, we need to set
        // the autocomplete to it, because it doesn't
        // work with 'placeholder' any more. :(
        //
        // The Pug views are rendered with a name
        // and id for the location that can be
        // inserted in here.
        if ($('#locid').data('id') > 0) {
          $('#jamlocation').autoComplete('set', {
            value: $('#locid').data('id'),
            text: $('#locid').data('text')
          })
        } else {
          // If nothing is selected, we are using
          // our own custom "placeholder"
          $('#jamlocation').autoComplete('set', {
            text: "<none selected>"
          })
        }

        //when the user selects a band
        //again, complicated because of Autocomplete
        //and Bootstrap 5 and placeholder.
        $('#jamlocation').on('autocomplete.select',
          function(event, item) {
            //this event fires whether or not they
            //actually made a selection!
            if (typeof item !== "undefined") {
              //they made a new selection. synchronize
              //the divs that store the data outside
              //of the control and then call updateJam()
              //to send the Ajax to update it.
              $('#locid').data('id', `${item.value}`);
              $('#locid').data('text', `${item.text}`);
              updateJam();
            } else {
              // they did not make a new selection, so
              // we have to either reset to blank/unfilled
              // or reset to the previous selection

              //something was already chosen for this jam
              if ($('#locid').data('id') > 0) {
                //repopulate
                $('#jamlocation').autoComplete('set', {
                  value: $('#locid').data('id'),
                  text: $('#locid').data('text')
                })
              } else {
                //nothing was chosen, so go back to
                //the "placeholder"
                $('#jamlocation').autoComplete('set', {
                  text: "<none selected>"
                }) //set the location back to 'placeholder'
              } //else there is no id set
            } //else the item was undefined
        }) //on select

        //When the user adds a new location
        $('#jamlocation').on('autocomplete.freevalue', addNewLocation)

        //Force our own 'placeholder' by clearing
        //the value when the user clicks on the textbox
        $('#jamlocation').focus(function(event) {
          $('#jamlocation').autoComplete('clear');
        })

        $('#clearJamLocationButton').click(function(e) {
          $('#locid').data('id', '-1');
          $('#locid').data('text', null);
          $('#jamlocation').autoComplete('set', {
            text: "<none selected>"
          }) //set the location back to 'placeholder'
          updateJam();
        }) //end clear jam location button callback

        /**
         * Setup Band Autocomplete
         */
        $('#jamband').autoComplete({})

        //If the jam already has a band
        //set, we have to setup the automcomplete
        //to show that. BS5 made it such that the
        //placeholder text stopped showing.
        if ($('#bandid').data('id') > 0) {
          $('#jamband').autoComplete('set', {
            value: $('#bandid').data('id'),
            text: $('#bandid').data('text')
          })
        } else {
          $('#jamband').autoComplete('set', {
            text: "<none selected>"
          })
        }

        //when the user selects a band
        $('#jamband').on('autocomplete.select',
          function(event, item) {
            if (typeof item !== "undefined") {
              $('#bandid').data('id', `${item.value}`);
              $('#bandid').data('text', `${item.text}`);
              updateJam();
            } else {
              if ($('#bandid').data('id') > 0) {
                $('#jamband').autoComplete('set', {
                  value: $('#bandid').data('id'),
                  text: $('#bandid').data('text')
                })
              } else {
                $('#jamband').autoComplete('set', {
                  text: "<none selected>"
                }) //set the band back to 'placeholder'
              } //else there is no id set
            } //else the item was undefined
        }) //on select

        //When the user adds a new band
        $('#jamband').on('autocomplete.freevalue', addNewBand)

        //Force our own 'placeholder' by clearing
        //the value when the user clicks on the textbox
        $('#jamband').click(function(event) {
          $('#jamband').autoComplete('clear');
        })

        $('#clearJamBandButton').click(function(e) {
          $('#bandid').data('id', '-1');
          $('#bandid').data('text', null);
          $('#jamband').autoComplete('set', {
            text: "<none selected>"
          }) //set the location back to 'placeholder'
          updateJam();
        }) //end clear jam band button callback
    	}) //retrieved the edit jam view
    }) //edit-jam-specific scripts have loaded
  }) //tempus domini has loaded
} //editjam(id)

function reloadPicsSection(jamid) {
  $.get(`/views/admin/jam/${jamid}/edit/pics`, function(view) {
    $('#picsHolder').html(view);
  })
}


function trackActionsFormatter(value, row) {
  return `<a href='javascript:playImmediately("${row.title}", "${row.path}")';>` +
          `<i class="fa fa-play me-1"></i></a>` +

          `<a href='javascript:deleteTrack(${value})';>` +
          `<i class="far fa-trash-alt me-1"></i></a>` +
          
          `<a href='${row.path}';>` +
          `<i class="fa-solid fa-download"></i></a>`+ 
          
          `<a href='javascript:moveTrackUp(${value})';>` +
          '<i class="fa-solid fa-up-long me-1"></i></a>';
}

//TRACK ACTIONS

function trackChanged(element) {
  var elementToGetTrackID = $(element);
  var trackid = elementToGetTrackID.data('track-id');

  var trackTitleJQ = $(`#track-title-${trackid}`);
  var newTitle = trackTitleJQ.val();

  var trackNotesJQ = $(`#track-notes-${trackid}`);
  var newNotes = trackNotesJQ.val();

  if (trackTitleJQ.data('previousTitle') !== newTitle ||
      trackNotesJQ.data('previousNotes') !== newNotes) {
    trackTitleJQ.data('previousTitle', newTitle);
    trackNotesJQ.data('previousNotes', newNotes);

    var jamid = $('#jamid').data('id');
    var toSend = {
      title: newTitle,
      notes: newNotes
    };

    $.ajax({
      method : "PUT",
      url : `/admin/jam/${jamid}/track/${trackid}`,
      contentType : "application/json",
      json: true,
      data: JSON.stringify(toSend)
    });
  }
}

function stripTrackNumbers() {
  var id = $('#jamid').data('id');
  $.ajax({
		method : "POST",
		url : `/admin/jam/${id}/stripTrackNumbers`,
		contentType : "application/json"
	}).done(function(msg) {
    $('#tracksTable').bootstrapTable('refresh');
	})
}

function deleteTrack(trackid) {
  var jamid = $('#jamid').data('id');
  $.ajax({
		method : "DELETE",
		url : `/admin/jam/${jamid}/tracks/${trackid}`,
		contentType : "application/json"
	}).done(function(msg) {
    $('#tracksTable').bootstrapTable('refresh');
	})
}

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
  if (item.length <= 3)
  {
    $('#jamband').autoComplete('set', {
      value: "-1",
      text: "<none selected>"
    })
  } else {
  showConfirmModal(
    `Are you sure you'd like to create the location "${item}" and select it for this jam?`,
  function() {
    $('#confirmModal').modal('hide');
    createEntity("locations", item, function(reply) {
      $('#locid').data('id', `${reply.id}`);
      $('#locid').data('text', `${reply.name}`);
      updateJam();
      $('#jamlocation').autoComplete('set', { value: reply.id, text: reply.name });
    });
  })
}
}

function addNewBand(event, item) {
  if (item.length <= 3)
  {
    $('#jamband').autoComplete('set', {
      value: "-1",
      text: "<none selected>"
    })
  } else {
    showConfirmModal(
      `Are you sure you'd like to create the band "${item}" and select it for this jam?`,
    function() {
      $('#confirmModal').modal('hide');
      createEntity("bands", item, function(reply) {
        $('#bandid').data('id', `${reply.id}`);
        $('#bandid').data('text', `${reply.name}`);
        updateJam();
        $('#jamband').autoComplete('set', { value: reply.id, text: reply.name });
      });
    })
  }
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


function closeEditJam() {
  var id = $('#jamid').data('id');
  loadJam(id);
}

function mapLocation(loc) {
	var myMap = new google.maps.Map($('#map-canvas')[0], {
    center: {
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lon)
    },
    zoom: 9,
    mapId: 'singleJamLocationMap',
    zoomControl: true,
    fullscreenControl: false
  });

  var marker = new google.maps.marker.AdvancedMarkerElement({
		position : {
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lon)
    },
		map: myMap,
		title: location.name
	});
}
