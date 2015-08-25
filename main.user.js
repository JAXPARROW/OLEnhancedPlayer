// ==UserScript==
// @name         OpenLoad to HTML5
// @namespace    https://github.com/JurajNyiri/
// @version      1.3
// @description  Replaces buggy and full-of-adds openload player with a clear html5 player.
// @author       Juraj Nyíri | jurajnyiri.eu
// @encoding utf-8
// @license http://opensource.org/licenses/MIT
// @homepage https://github.com/JurajNyiri/OLEnhancedPlayer
// @match        https://openload.co/*
// @match        https://openload.tv/*
// @grant        none
// @require http://code.jquery.com/jquery-latest.js
// @updateURL https://raw.githubusercontent.com/JurajNyiri/OLEnhancedPlayer/master/main.user.js
// @downloadURL https://raw.githubusercontent.com/JurajNyiri/OLEnhancedPlayer/master/main.user.js
// ==/UserScript==

var videoElem = false;
var clicks = 0;
var timo;
var videoInFS = false;
$(function() {
	$.get(window.location.href, function(data) {
		var subtitleshtml = data.substring(data.indexOf("<track kind=\"captions\" src=\""),(data.lastIndexOf("</track>")+8));
		var htmlcontent = "<video id=\"realVideoElem\" style=\"width: 100%; height:100%;\" controls poster=\""+$('video').attr('poster')+"\"><source src=\""+$("video source").attr('src')+"\" type=\"video/mp4\">";
		htmlcontent += subtitleshtml;
		htmlcontent += "</video>";
		$(".videocontainer").html(htmlcontent)
		videoElem = $("#realVideoElem");
		$(videoElem).bind( "click", function() 
		{
            videoClick()
		});
		videoElem[0].play();
	});
})

function videoFS(elem)
{
    videoInFS = !videoInFS;
    if(videoInFS)
    {
        if (elem.requestFullscreen) 
        {
            elem.requestFullscreen();
        } 
        else if (elem.mozRequestFullScreen) 
        {
            elem.mozRequestFullScreen();
        } 
        else if (elem.webkitRequestFullscreen) 
        {
            elem.webkitRequestFullscreen();
        }
    }
    else
    {
        try 
        {
            elem.exitFullscreen();
        } 
        catch(err)
        {
            try
            {
                elem.mozCancelFullscreen();
            }
            catch(err)
            {
                try
                {
                    elem.webkitExitFullscreen();
                }
                catch(err)
                {
                    
                }
            }
        }
    }
}

function videoClick()
{
    clicks++;
    clearTimeout(timo);
    console.log(clicks)
    if(clicks == 2)
    {
        clearTimeout(timo);
        clicks = 0;
        videoFS(videoElem[0]);
    }
    else
    {
        timo = setTimeout(function () 
        {
            pausePlayVideo(videoElem[0]);
            clicks = 0;
        },250); 
    }
}

function pausePlayVideo(video)
{
	if (video.paused == true)
	{
		video.play();
	}
	else
	{
		video.pause();
	}
}

$(window).keypress(function(e) 
{
	if(videoElem)
	{
		if (e.which == 32) 
		{
			pausePlayVideo(videoElem[0]);
		}
        e.preventDefault();
	}
});
