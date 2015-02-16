$(document).ready(function(){
   $("#recentButton").click(loadRecentJams)
   $('#recentButton').css('cursor','pointer');

})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
		var html = "";
		console.log(data)
		if (data.error)
		{
			alert('We encountered an issue.')
		}
		else
		{
	  		data.forEach(function (thisjam, index, array) {
	  			mydate = Date.parse(thisjam.date.substr(0,10)).toString("MM/dd/yyyy")
	  			html += "<div class='item'>"
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
	  		})
	  		$("#thispage").html(html)
		} //there was no error
	}); //get
}

function loadJam(id)
{
	$.get( "/jam/" + id, function( thisjam ) {
		console.log(thisjam)
		var html = "";
		mydate = Date.parse(thisjam.date.substr(0,10)).toString("MM/dd/yyyy")
		html += "<div class='item'>"
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
		$("#thispage").html(html)
	});
}