$(document).ready(function(){
   $("#recentButton").click(loadLink)
   
   $('a').css('cursor','pointer');
})

function loadRecentJams()
{
	$.get( "/recent", function( data ) {
  		data.forEach(function (element, index, array) {
  			console.log(data.id + "...");
  		})
	});
}