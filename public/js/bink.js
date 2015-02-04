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
  			html += "<div class='item'>"
  			html += "<h1><a href=''>" + element.date + " - " + element.title + "</a></h1>"
  			html += "<div class='quote'>" + element.notes + "</div>"
  			html += "</div>"
  		})
  		$("#thispage").html(html)
	});
}