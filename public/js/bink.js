$(document).ready(function(){
   $("#recentButton").click(loadLink)
   
   $('a').css('cursor','pointer');
})

function loadRecentJams()
{
	$("#thispage").html("<h1>Recent Jams</h1>")
}