// ==UserScript==
// @name         OpenLoad to HTML5
// @namespace    https://github.com/JurajNyiri/
// @version      1.8
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
// @run-at   document-start
// @grant    GM_setValue
// @grant    GM_getValue
// ==/UserScript==

//Modify these
var useTrakt = false; //Whether to use trakt.tv integration
var traktClientID = "";
var traktClientSecret = "";
var playedPercentToSendToTrakt = 0.9;
var playedSecondsToSendToTrakt = 180;
//Do not change anything under this.


var videoElem = false;
var clicks = 0;
var timo;
var timu;
var videoInFS = false;
var inIframe = false;
var parentSite = ""
var vidDuration = false;
var playedSeconds = 0;


//remove all original scripts
$('script').each(function( index ) 
{
    $(this).attr("src","");
    $(this).html("");
});

$(document).on('mousemove', function() {
    clearTimeout(timu);
    document.body.style.cursor = 'default';
    timu = setTimeout(function() 
    {
        if(videoElem && videoInFS)
        {
            document.body.style.cursor = 'none';
        }
    }, 3400);
});

function popupwindow(url, title, w, h) 
{
    var left = (screen.width/2)-(w/2);
    var top = (screen.height/2)-(h/2);
    return window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+top+', left='+left);
} 

function modifyPlayer()
{
    $.get(window.location.href, function(data) 
    {
        if($("video source").attr('src').indexOf("/stream/") > -1)
        {
            inIframe = true;
            $.ajax({
                url:$("video source").attr('src'),
                complete: function(xhr) 
                {
                    var realSrc = xhr.getResponseHeader("x-redirect");
                    processVideo(data,realSrc);
                }
            });
        }
        else
        {
            inIframe = false;
            processVideo(data,$("video source").attr('src'));
        }
    });
}

function firstAuthentication(traktPIN)
{
    var postData = 
    {
        'code': traktPIN,
        'redirect_uri': "urn:ietf:wg:oauth:2.0:oob",
        'grant_type': 'authorization_code',
        'client_id': traktClientID,
        'client_secret': traktClientSecret,
        'response_type': "code"
    }


    $.ajax({
        url: 'https://api-v2launch.trakt.tv/oauth/token',
        type: "POST",
        data: JSON.stringify(postData),
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        complete: function(xhr)
        {
            if(xhr.status == 200)
            {
                var data = JSON.parse(xhr.responseText);
                
                GM_setValue("traktAccessToken",data.access_token)
                GM_setValue("traktAccessTokenCreated",data.created_at)
                GM_setValue("traktRefreshToken",data.refresh_token)
                getNewAccessToken(data.refresh_token)
            }
            else
            {
                alert("Incorrect PIN code entered!");
                StartFirstTimeTraktAuth()
            }
        }
    });
}

function StartFirstTimeTraktAuth()
{
    var traktAuth = popupwindow("https://trakt.tv/pin/6025",'Trakt authentication',500,600);
    if (window.focus) 
    {
        traktAuth.focus();
        var timer = setInterval(function() 
        {   
            if(traktAuth.closed) 
            {                             
                clearInterval(timer);  
                var traktPIN = prompt("Please enter trakt.tv PIN code:", "");
                if ((traktPIN != null) && (traktPIN != ""))
                {
                    firstAuthentication(traktPIN)
                }
                else 
                {
                    alert("Track login process cancelled.\nSet useTrakt variable in source code to false to cancel permanently.");
                    modifyPlayer()
                }
            }
        }, 250); 
    }
}

function getNewAccessToken(refresh_token)
{
    var postData = 
    {
        'refresh_token': refresh_token,
        'redirect_uri': "urn:ietf:wg:oauth:2.0:oob",
        'client_id': traktClientID,
        'client_secret': traktClientSecret,
        "grant_type": "refresh_token"
    }

    $.ajax({
        url: 'https://api-v2launch.trakt.tv/oauth/token',
        type: "POST",
        data: JSON.stringify(postData),
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        complete: function(xhr)
        {
            if(xhr.status == 200)
            {
                var data = JSON.parse(xhr.responseText);
                
                GM_setValue("traktAccessToken",data.access_token)
                GM_setValue("traktAccessTokenCreated",data.created_at)
                GM_setValue("traktRefreshToken",data.refresh_token)
                
                traktTokenRefreshed()
            }
            else
            {
                StartFirstTimeTraktAuth()
            }
        }
    });
}

function traktTokenRefreshed()
{
    
}

function getEpisodeAndSeries(str)
{
    var info = {
        series: parseInt(str.substring(str.indexOf("s")+1,str.indexOf('e')),10),
        episode: parseInt(str.substring(str.indexOf("e")+1),10)
    }
    
    return info;
}

function setWatchedFromProvider(provider)
{
    if(provider.indexOf("topserialy.sk") > -1)
    {
        var words = provider.substring(provider.lastIndexOf("/") + 1).split("-");
        var searchQuery = "";
        for(var i = 0, len = words.length; i < len-1; i++)
        {
            searchQuery += words[i] + " "
        }
        searchQuery = searchQuery.slice(0, - 1);
        info = getEpisodeAndSeries(words[words.length-1])
        findTVShowTrakt(searchQuery,info);
    }
    else
    {
        return false;
    }
}

function findTVShowTrakt(name,info)
{
    $.ajax({
        url:'https://api-v2launch.trakt.tv/search?query='+name,
        contentType: "application/json; charset=utf-8",
        headers: 
        {
            "trakt-api-version":"2",
            "trakt-api-key":traktClientID
        },
        complete: function(xhr) 
        {
            setWatched(JSON.parse(xhr.responseText)[0],info);
        }
    });
}

function setWatched(show,info)
{
    var postData = 
    {
        'shows': [
            {
                'title': show.show.title,
                'year': show.show.year,
                'ids': 
                {
                    'trakt': show.show.ids.trakt,
                    'slug': show.show.ids.slug,
                    'tvdb': show.show.ids.tvdb,
                    'imdb': show.show.ids.imdb,
                    'tmdb': show.show.ids.tmdb,
                    'tvrage': show.show.ids.tvrage
                },
                'seasons': 
                [
                    {
                        'number': info.series,
                        'episodes': 
                        [
                            {
                                'number': info.episode
                            }
                        ]
                    }
                ]
            }
        ]
    }
    var headers =
    {
        "trakt-api-version":"2",
        "trakt-api-key":traktClientID,
        "Authorization":'Bearer '+GM_getValue("traktAccessToken")
    }
    $.ajax({
        url: 'https://api-v2launch.trakt.tv/sync/history',
        type: "POST",
        data: JSON.stringify(postData),
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        headers: headers,
        complete: function(xhr)
        {
            if(xhr.status == 201)
            {
                console.log("Sent to trakt.tv")
            }
            else
            {
                console.log(xhr)
            }
        }
    });
}

$(function() 
{
    parentSite = document.referrer;
    if((typeof GM_getValue("traktAccessToken") === "undefined")&&useTrakt)
    {
        StartFirstTimeTraktAuth()
    }
    else
    {
        if(Math.floor(Date.now() / 1000) - GM_getValue("traktAccessTokenCreated") > 5184000)
        {
            getNewAccessToken(GM_getValue("traktRefreshToken"))
        }
        
        modifyPlayer()
    }
});

function processVideo(data,realSrc)
{
    var subtitleshtml = data.substring(data.indexOf("<track"),(data.lastIndexOf("</track>")+8));
    var htmlcontent = "<video id=\"realVideoElem\" style=\"width: 100%; height:100%;\" controls poster=\""+$('video').attr('poster')+"\"><source src=\""+realSrc+"\" type=\"video/mp4\">";
    htmlcontent += subtitleshtml;
    htmlcontent += "</video>";
    if(inIframe)
    {
        $(".videocontainer").html(htmlcontent)
    }
    else
    {
        $("html").html(htmlcontent)
    }
    videoElem = $("#realVideoElem");
    $(videoElem).bind( "click", function() 
    {
        videoClick()
    });
    videoElem[0].play();
    var checkDurationTimer = setInterval(function(){
        if (videoElem[0].readyState > 0) 
        {
            vidDuration = videoElem[0].duration;
            clearInterval(checkDurationTimer);
        }
    },500);
    var checkNearEndOfVideo = setInterval(function(){
        if ((vidDuration) && (!videoElem[0].paused))
        {
            playedSeconds++;
            if((videoElem[0].currentTime/vidDuration > playedPercentToSendToTrakt) && (playedSeconds > playedSecondsToSendToTrakt))
            {
                setWatchedFromProvider(parentSite);
                clearInterval(checkNearEndOfVideo);
            }
        }
    },1000);
}

$(document).on('mozfullscreenchange webkitfullscreenchange fullscreenchange',function()
{
    videoInFS = !videoInFS;
});


function videoFS(elem)
{
    if(!videoInFS)
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
        if (e.which == 102) 
		{
			clearTimeout(timo);
            clicks = 0;
            videoFS(videoElem[0]);
		}
        e.preventDefault();
	}
});

