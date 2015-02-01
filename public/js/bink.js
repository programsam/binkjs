$(document).ready(function(){
   $("#recentButton").click(loadLink)
   $('a').css('cursor','pointer');
})

function loadLink(event)
{
	if (event.target.id == "recentButton")
	{
		loadRecentJams()
	}
	else
	{
		$("#thispage").html("<h1>" + event.target.id + " was clicked</h1>");
	}
} 


function loadRecentJams()
{
	$("#thispage").html("<h1>Recent Jams</h1>")
}