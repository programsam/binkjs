$(document).ready(function(){
   $("a#recentButton").click(loadRecentJams)
})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
		console.log(data)
		var html = "";
		html += "<div class='row'>"
		data.forEach(function (thisjam, index, array) {
  			var d = new Date(thisjam.date)
  			var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
  			html += "<div class='col-xs-6 col-md-3 well'>"
  			html += "<h4>" + mydate + " - " + thisjam.title + "</h4>"
  			if (thisjam.hasOwnProperty("band"))
  			{
  				html += thisjam.band.name
  			}
  			if (thisjam.hasOwnProperty("band") && thisjam.hasOwnProperty("location"))
  			{
  				html += " at "
  			}
  			if (thisjam.hasOwnProperty("location"))
  			{
  				html += thisjam.location.name
  			}
  			html += "<p /><div class='quote'>" + thisjam.notes + "</div>"
  			html += "<div align='right'><button onclick='loadJam(" + thisjam.id + ")' type='button' class='btn btn-default' aria-label='Load this Jam'><span class='glyphicon glyphicon-expand' aria-hidden='true'></span></button></div>"
  			
  			html += "</div>"
	  		})
	  	html += "</div>"
	  	$(".main").html(html)
	})
	.fail(function()
	{
		alert('Encountered a problem.')
	})
}

function loadJam(id)
{
	$.get( "/jam/" + id, function( thisjam ) {
		console.log(thisjam)
		var html = "";
		var d = new Date(thisjam.date)
		var mydate = (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()
		html += "<div class='well'>"
		html += "<h1><a id='jam" + thisjam.id + "' onclick='loadJam(" + thisjam.id + ")' style='cursor:pointer'>" + mydate + " - " + thisjam.title + "</a></h1>"
		if (thisjam.hasOwnProperty("band"))
		{
			html += thisjam.band.name
		}
		if (thisjam.hasOwnProperty("band") && thisjam.hasOwnProperty("location"))
		{
			html += " at "
		}
		if (thisjam.hasOwnProperty("location"))
		{
			html += thisjam.location.name
		}
		html += "<p /><div class='quote'>" + thisjam.notes + "</div>"
		html += "</div>"
		$(".main").html(html)
	});
}