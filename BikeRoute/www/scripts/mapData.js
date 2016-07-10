var MapData = (function ($) {
    "use strict";

    var MapData = {};

    function urlBase() {
        //return "http://localhost:60080/Service1.svc/";
        return "http://www.quilkin.co.uk/Service1.svc/";

    }
    function webRequestFailed(handle, status, error) {
        bootbox.alert("Web Error: " + error);
    }

    MapData.json = function (url, type, data, successfunc) {
        var thisurl = urlBase() + url;
        if (data === null) {
            $.ajax({
                type: type,
                url: thisurl,
                contentType: 'application/x-www-form-urlencoded',
                success: successfunc,
                error: webRequestFailed
            });
        }
        else {
            var dataJson = JSON.stringify(data);

            $.ajax({
                type: type,
                data: dataJson,
                url: thisurl,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: successfunc,
                error: webRequestFailed
            });
        }
    };

    MapData.jsonMapzen = function (elev, data, successfunc) {
        var dataJson = JSON.stringify(data);
        var url;
        if (elev)
            url = 'https://elevation.mapzen.com/height?&api_key=elevation-fMwHH2H';
        else
            url = 'https://valhalla.mapzen.com/route?&api_key=valhalla-3F5smze';
        $.ajax({
            url: url,
            type: "POST",
            data: dataJson,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: successfunc,
            error: webRequestFailed
        });
    };

    return MapData;


}(jQuery));
