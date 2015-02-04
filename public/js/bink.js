$(document).ready(function(){
   $("#recentButton").click(loadRecentJams)
   $('#recentButton').css('cursor','pointer');

})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
		var html = "";
		var result = JSON.parse(data)
  		result.forEach(function (element, index, array) {
  			mydate = Date.parse(x.substr(0,10)).toString("MM/dd/yyyy")
  			html += "<div class='item'>"
  			html += "<h1><a href=''>" + mydate + " - " + element.title + "</a></h1>"
  			html += "<div class='quote'>" + element.notes + "</div>"
  			html += "</div>"
  		})
  		$("#thispage").html(html)
	});
}