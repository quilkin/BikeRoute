﻿/// <reference path="bootbox.min.js" />
/// <reference path="mapData.js" />
/// <reference path="index.js" />
/// <reference path="utils.js" />


var myMap = (function ($) {
    "use strict";

    aggressiveEnabled: false;
    // distance to check if on track or not (approx 100 m)
    // approximate to metres.
    // one degree = 100 km approx
    // **ToDo** : this won't work at high latitudes!
    var near = 0.001;
    // distance to check if too far from track
    var far = 500;
    // message when off track
    var offTrack1 = "Attention! You are "
    var offTrack2 = " metres off course. Correct course is to the "

    var myMap = {},
        map,
        location = null,
        path,
        aggressiveEnabled,
        //locations = [],
        iconCentre1,
        messageBox,
        routeLine = null,
        distances = [],
        ascents = [],
        descents = [],
        routes = [],
        routePoints = [],
        wayPoints = [],
        markers = [],
        legs = [],
        lastMarker = null,
        lastInstruction = null,
        lastInstructionTime = null,
        lastInstructionCount = 0,
        watchID = null,
        currentLat, currentLong,
        currentPosMarker = null,
       // followedPoints = [],
        polyLineAll = '',
        nearestPoint = null,
        lastNearestPoint = null,
        onTrack = false,


        maxGrad = 0,
        nearest,nextNearest,
        dialog, dialogContents;

 
    var bikeType = 'Hybrid';
    var useRoads = 5;
    var useHills = 5;

    var redIcon = new L.Icon({
        iconUrl: 'scripts/images/marker-icon-red.png',
        shadowUrl: 'scripts/images/marker-shadow.png',
        iconSize: [15, 25],
        iconAnchor: [8, 25],
        popupAnchor: [1, -20],
        shadowSize: [2, 2]
    });

    var greenIcon = new L.Icon({
        iconUrl: 'scripts/images/marker-icon-green.png',
        shadowUrl: 'scripts/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    var orangeIcon = new L.Icon({
        iconUrl: 'scripts/images/marker-icon-orange.png',
        shadowUrl: 'scripts/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    var yellowIcon = new L.Icon({
        iconUrl: 'scripts/images/marker-icon-yellow.png',
        shadowUrl: 'scripts/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });


    // Create additional Control placeholders
    function addControlPlaceholders(map) {
        var corners = map._controlCorners,
            l = 'leaflet-',
            container = map._controlContainer;

        function createCorner(vSide, hSide) {
            var className = l + vSide + ' ' + l + hSide;

            corners[vSide + hSide] = L.DomUtil.create('div', className, container);
        }

        createCorner('verticalcenter', 'left');
        createCorner('verticalcenter', 'right');
        createCorner('center', 'left');
        createCorner('center', 'right');

    }
    function onGeoSuccess(position) {
        currentLat = position.coords.latitude;
        currentLong = position.coords.longitude;
        if (thisIsDevice) {
            if (currentPosMarker != null)
                map.removeLayer(currentPosMarker);
            currentPosMarker = L.marker([currentLat, currentLong], { icon: redIcon }).addTo(map);
            myMap.checkInstructions(currentLat, currentLong);
        }
    }

    function onGeoError(error) {
        bootbox.alert('code: ' + error.code + '\n' +
              'message: ' + error.message + '\n');
    }
    myMap.stopPositionWatch = function () {
        navigator.geolocation.clearWatch(watchID);
    };
    myMap.watchPosition = function () {
        watchID = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, { timeout: 10000 });
    };

    function speak(mytext,point) {
        if (mytext.length < 2)
            return;
        mytext = mytext.replace('Bike', 'Cycle');
        
        if (lastInstruction != null) {
            if (lastInstruction === mytext) {
                // don't repeat too often!!
                var now = new Date();
                var diff = Math.abs(now - lastInstructionTime);
                if (diff < 30000)
                    return;
                if (lastInstructionCount > 3)
                    return;
            }
            else {
                lastInstructionCount = 0;
            }
        }
        if (L.Browser.mobile) {
            TTS.speak(
                {
                    text: mytext,
                    locale: 'en-GB',
                    rate: 1
                },
                setLastInstruction,
                function (reason) {
                    bootbox.alert("Speech failed: " + reason);
                }
            );
        }
        else {
            // simulate the speech with a bubble on the screen
            var popup = L.popup()
                .setLatLng(point)
                .setContent(mytext)
                .openOn(map);
            setLastInstruction();
        }

        function setLastInstruction() {
            lastInstructionTime = new Date();
            lastInstruction = mytext;
            ++lastInstructionCount;
        }

    }

    myMap.getData = function() {
        ascents = JSON.parse(localStorage.getItem("ascents")) || [];
        descents = JSON.parse(localStorage.getItem("descents")) || [];
        //routes = JSON.parse(localStorage.getItem("routes")) || [];
        routePoints = JSON.parse(localStorage.getItem("routepoints")) || [];
        wayPoints = JSON.parse(localStorage.getItem("waypoints")) || [];
        distances = JSON.parse(localStorage.getItem("distances")) || [];
    }

    if (L.Browser.mobile) {
        // get the actual location
        navigator.geolocation.getCurrentPosition(function (position) {
            $('#waiting').hide();
            var latitude = position.coords.latitude;
            var longitude = position.coords.longitude;
            var options = { timeout: 5000, position: 'bottomleft' }

            map = L.map('map').setView([latitude, longitude], 14);

            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 18

            }).addTo(map);
            AddControls();

            myMap.watchPosition();
            loadOldRoutes();
            //watchID = navigator.geolocation.watchPosition(onGeoSuccess, onGeoError, { timeout: 10000 });


        });
    }
    else {
         //get the list of points to map
        MapData.json('GetLocations', "POST", null, function (locs) {
            $('#waiting').hide();
            // first point will be the latest one recorded, use this to centre the map
            location = locs[0];
            var options = { timeout: 5000, position: 'bottomleft' }
            map = L.map('map').setView([location.latitude, location.longitude], 14);
            
            L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 18
            }).addTo(map);


            var index, count = locs.length;
            var now = new Date();
            var reggie = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/;
            var dateArray, dateObj;
            for (index = count - 1; index >= 0; index--)
            {
                var loc = locs[index];
                if (loc.latitude != 0) {
                    var dt = now;
                    // convert SQL date string to EU format
                    dateArray = reggie.exec(loc.recorded_at);
                        dt   = new Date(
                        (+dateArray[3]),
                        (+dateArray[2]) - 1, // Careful, month starts at 0!
                        (+dateArray[1]),
                        (+dateArray[4]),
                        (+dateArray[5]),
                        (+dateArray[6])
                    );

                    var colour = (index === 0) ? 'red' : 'blue';
                    if (now.getDate() != dt.getDate())
                        colour = 'gray';

                    var circle = L.circle([loc.latitude, loc.longitude], (index === 0) ? 60 : 15, {
                        color: colour,
                        fillColor: colour,
                        fillOpacity: 0.5
                    }).addTo(map);
                    circle.bindPopup(loc.recorded_at);
                }
            }
            AddControls();
            loadOldRoutes();

        }, true, null);
    }
    myMap.getData();

    function loadOldRoutes() {
        //var locations = [];
        //for (var r = 0; r < routePoints.length; r++) {
        //    var lat = routePoints[r][0];
        //    var lon = routePoints[r][1];
        //    locations.push([lat, lon]);
        //}

        var route = new L.Polyline(routePoints, {
            color: 'red',
            opacity: 1,
            weight: 2,
            clickable: false
        }).addTo(map);
        routes.push(route);


        
        for (var m = 0; m < wayPoints.length; m++) {
            if (m == 0) {
                lastMarker = L.marker([wayPoints[m].lat, wayPoints[m].lng], { icon: greenIcon }).addTo(map);
            }
            else {
                lastMarker = L.marker([wayPoints[m].lat, wayPoints[m].lng]).addTo(map);
            }
            markers.push(lastMarker);

        }
    }
    function AddControls() {

        addControlPlaceholders(map);

        if (L.Browser.mobile == false) {
            L.control.mousePosition().addTo(map);
        }

        // a cross-hair for choosing points
        iconCentre1 = L.control({ position: 'centerleft' });
        iconCentre1.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'myControl');
            var img_log = "<div><img src=\"images/crosshair.png\"></img></div>";
            this._div.innerHTML = img_log;
            return this._div;

        }
        iconCentre1.addTo(map);


        //L.easyButton('<span class="bigfont">&rarr;</span>', createRoute).addTo(map);
        L.easyButton('<span class="bigfont">&check;</span>', addPoint).addTo(map);
        L.easyButton('<span class="bigfont">&circlearrowleft;</span>', deletePoint).addTo(map);
        L.easyButton('<span class="bigfont">&odot;</span>', options).addTo(map);
        L.easyButton('<span class="bigfont">&cross;</span>', clearRoute).addTo(map);
        myMap.bikeType = "Hybrid";

    }
    function options() {
        if (wayPoints.length > 2) {
            bootbox.alert("Cannot change options after more than one waypoint set"); return;
        }
        var contents =
                '<div class="row">  ' +
                '<div class="col-md-12"> ' +
                '<form class="form-horizontal"> ' +
                '<div class="form-group"> ' +
                '<label class="col-xs-6 col-md-4 control-label" for="bike">Bike Type?</label> ' +
                '<div class="col-xs-6 col-md-4">' +
                '<div class="radio"> <label for="bike-0"> ' +
                '<input type="radio" name="bike" id="bike-0" value="Mountain"' + ((bikeType === 'Mountain') ? 'checked="checked"' : '') + '"> Mountain </label> ' +
                '</div><div class="radio"> <label for="bike-1"> ' +
                '<input type="radio" name="bike" id="bike-1" value="Cross" ' + ((bikeType === 'Cross') ? 'checked="checked"' : '') + '"> Cross </label> ' +
                '</div><div class="radio"> <label for="bike-2"> ' +
                '<input type="radio" name="bike" id="bike-2" value="Hybrid"' + ((bikeType === 'Hybrid') ? 'checked="checked"' : '') + '"> Hybrid/Town </label> ' +
                '</div><div class="radio"> <label for="bike-3"> ' +
                '<input type="radio" name="bike" id="bike-3" value="Road" ' + ((bikeType === 'Road') ? 'checked="checked"' : '') + '"> Road </label> ' +
                '</div> ' +
                '</div> </div>' +
                '<div class="form-group"> ' +
                '<label class="col-xs-6 col-md-4 control-label" for="hills">Use of hills</label> ' +
                '<div class="col-xs-6 col-md-4">' +
                '<div class="radio"> <label for="hills-0"> ' +
                '<input type="radio" name="hills" id="hills-0" value="0"' + ((useHills < 3) ? 'checked="checked"' : '') + '"> Little as possible </label> ' +
                '</div><div class="radio"> <label for="hills-1"> ' +
                '<input type="radio" name="hills" id="hills-1" value="5" ' + ((useHills >= 3 && useHills <= 7) ? 'checked="checked"' : '') + '"> A few </label> ' +
                '</div><div class="radio"> <label for="hills-2"> ' +
                '<input type="radio" name="hills" id="hills-2" value="10"' + ((useHills > 7) ? 'checked="checked"' : '') + '"> Lots </label> ' +
                '</div> ' +
                '</div> </div>' +
                '<div class="form-group"> ' +
                '<label class="col-xs-6 col-md-4 control-label" for="roads">Use of main roads</label> ' +
                '<div class="col-xs-6 col-md-4">' +
                '<div class="radio"> <label for="roads-0"> ' +
                '<input type="radio" name="roads" id="roads-0" value="0"' + ((useRoads < 3) ? 'checked="checked"' : '') + '"> Little as possible </label> ' +
                '</div><div class="radio"> <label for="roads-1"> ' +
                '<input type="radio" name="roads" id="roads-1" value="5" ' + ((useRoads >= 3 && useRoads <= 7) ? 'checked="checked"' : '') + '"> A few </label> ' +
                '</div><div class="radio"> <label for="roads-2"> ' +
                '<input type="radio" name="roads" id="roads-2" value="10"' + ((useRoads > 7) ? 'checked="checked"' : '') + '"> More </label> ' +
                '</div> ' +
                '</div> </div>' +
                '</form> </div>  </div>';
        bootbox.dialog({
            title: "Options",
            message: contents,
            buttons: {
                success: {
                    label: "Save",
                    className: "btn-success",
                    callback: function () {
                        bikeType = $("input[name='bike']:checked").val();
                        useHills = $("input[name='hills']:checked").val();
                        useRoads = $("input[name='roads']:checked").val();
                        if (wayPoints.length === 2)
                            createRoute();
                    }
                }
            }
        });
     }

    function addPoint() {

        var centre = map.getCenter();
        wayPoints.push(L.latLng(centre.lat, centre.lng));


        if (wayPoints.length === 1) {
            var marker = L.marker([centre.lat, centre.lng], { icon: greenIcon }).addTo(map);
            markers.push(marker);
            // this is first (starting) point. Need more points!
            distances = [];
            routePoints = [];
            //TTS.speak("Starting route");
            return;
        }

        lastMarker = L.marker([centre.lat, centre.lng]).addTo(map);

        markers.push(lastMarker);
        createRoute();

    }
    function deletePoint()
    {
        if (wayPoints.length < 2) {
            bootbox.alert("No waypoints to delete!")
            return;
        }
        map.removeLayer(markers.pop());
        distances.pop();
        ascents.pop();
        descents.pop();
        wayPoints.pop();
        map.removeLayer(routes.pop());
        showStats();

    }

    function showStats() {
        var leg, totalDist = 0, totalAsc = 0, totalDesc = 0;
        for (leg = 0; leg < distances.length; leg++) {
            totalDist += distances[leg];
        }
        for (leg = 0; leg < ascents.length; leg++) {
            totalAsc += ascents[leg];
        } for (leg = 0; leg < descents.length; leg++) {
            totalDesc += descents[leg];
        }
        totalDist = (Math.round(totalDist * 10) / 10);
       // map.messagebox.show('Dist: ' + totalDist + ' km; Asc: ' + totalAsc + 'm; Desc: ' + totalDesc );
        //bootbox.alert('Dist: ' + totalDist + ' km; Asc: ' + totalAsc + 'm; Desc: ' + totalDesc);
        lastMarker.bindPopup('Dist: ' + totalDist + ' km; Asc: ' + totalAsc + 'm; Desc: ' + totalDesc).openPopup(); 
    }
   
    function clearRoute() {
        bootbox.confirm("Do you really want to clear your complete route?", function (result) {
            if (result===true)
            {
                var length = routes.length;
                for (var r = 0; r < length; r++) {
                    map.removeLayer(routes.pop());
                }
                length = markers.length;
                for (var m = 0; m < length; m++) {
                    map.removeLayer(markers.pop());
                }
                distances = [];
                ascents = [];
                descents = [];
                wayPoints = [];
                routePoints = [];
            }
        })
    }
    
    

    function createRoute()
    {
        if (wayPoints.length < 2)
        {
            return;
        }
        var points = wayPoints.length;
        var lastPoint = wayPoints[points - 1];
        var lastButOne = wayPoints[points - 2];

        var data = {
            locations: [{ lat: lastButOne.lat, lon: lastButOne.lng }, { lat: lastPoint.lat, lon: lastPoint.lng }],
            //locations: points,
             costing: "bicycle",
            costing_options: {
                bicycle: {
                    bicycle_type: myMap.bikeType,
                    use_roads: myMap.useRoads / 10,
                    use_hills: myMap.useHills / 10
                }
            }
        }
        MapData.jsonMapzen(false,data,getRoute);
    }

    function getRoute(response) {
       
        //routePoints = [];
        //followedPoints = [];
        nearestPoint = null;
        onTrack = false;
        polyLineAll = '';

        // should only be one leg for each pair of waypoints?
        for (var i = 0; i < response.trip.legs.length; i++) {
            var leg = response.trip.legs[i];
            var legDist = 0;
            var legPoints= [];
            var index = 0;
            for (var j = 0; j < leg.maneuvers.length; j++) {
                var maneuver = leg.maneuvers[j];
                var instruction = maneuver.verbal_pre_transition_instruction;
                var shapeIndex = maneuver.begin_shape_index;
                legDist += maneuver.length;
                
                while (index++ < shapeIndex)
                {
                    // no instructions at these points
                    legPoints.push('');
                }
                legPoints.push(instruction);
            }
            // now get coordinates of all points
            var pline = leg.shape;
            polyLineAll = polyLineAll + pline;
            //polyLineAll = pline;
            var locations = utils.polyLineDecode(pline, 6);

            var colour = 'red';

            var route = new L.Polyline(locations, {
                color: colour,
                opacity: 1,
                weight: 2,
                clickable: false
            }).addTo(map);

            routes.push(route);
            distances.push(legDist);
            for (var loc = 0; loc < locations.length; loc++) {
                // save points passed through, and store any instruction for each point 
                var p1 = locations[loc][0], p2 = locations[loc][1];
                //var instr = (loc > 0) ? legPoints[loc - 1] : legPoints[loc];
                var instr =  legPoints[loc];
                routePoints.push([p1, p2, instr]);

            }
        }
        // get elevation data
        var data = {
            range: true,
            encoded_polyline: polyLineAll
        }
        //tempData.push(data);
        MapData.jsonMapzen(true,data, getElevations);

    }

    function getElevations(response) {
        var elevs = response.range_height;
        var legAsc = 0;
        var legDesc = 0;
        var legDist = 0;
        var lastElev = null, lastDist = 0;
        maxGrad = 0;
        for (var e = 0; e < elevs.length; e++) {
            var thisElev = elevs[e][1];
            var dist = elevs[e][0];
            if (thisElev != null && dist < 100000) {
                legDist = dist;
                if (lastElev != null) {
                    var deltaElev = (thisElev - lastElev);
                    var thisDist = legDist - lastDist;
                    var grad = deltaElev / thisDist;
                    if (grad > maxGrad) {
                        maxGrad = grad;
                    }
                    if (deltaElev > 0)
                        legAsc += deltaElev;
                    else
                        legDesc -= deltaElev;
                }
                lastElev = thisElev;
                lastDist = legDist;
            }
            else {
                var error = "!";
            }

        }
        ascents.push(legAsc);
        descents.push(legDesc);
        showStats();
        localStorage.setItem("ascents", JSON.stringify(ascents));
        localStorage.setItem("descents", JSON.stringify(descents));
        //localStorage.setItem("routes", JSON.stringify(routes));
        localStorage.setItem("routepoints", JSON.stringify(routePoints));
        localStorage.setItem("waypoints", JSON.stringify(wayPoints));
        localStorage.setItem("distances", JSON.stringify(distances));
    }

   

    myMap.checkInstructions = function (lat, lon) {
        if (routePoints == null)
            return;
        var thisPoint = [lat, lon];

        //followedPoints.push(thisPoint);
        if (nearestPoint === null && onTrack === false) {
            // Nowhere near?. Check point against all points in the route
            for (var loc = 0; loc < routePoints.length; loc++) {
                var point = routePoints[loc];
                var dist = utils.distanceBetweenCoordinates(thisPoint, point);
                if (Math.abs(point[0] - lat) < near) {
                    if (Math.abs(point[1] - lon) < near) {
                        nearestPoint = loc;
                        onTrack = true;
                        break;
                    }
                }
            }
        }
        else {
            // we are (or were) on track, see how far we are from the nearest route segments 
            lastNearestPoint = nearestPoint;
            var threePoints1 = (nearestPoint > 0) ? nearestPoint - 1 : nearestPoint;
            var threePoints2 = nearestPoint;
            var threePoints3 = (nearestPoint < routePoints.length - 1) ? nearestPoint + 1 : nearestPoint;
            // how far are we from here to a line joining the current two route points?
            nearest = utils.pointToLine(thisPoint, routePoints[threePoints1], routePoints[threePoints2]);
            // how far are we from here to a line joining the next two route points?
            nextNearest = utils.pointToLine(thisPoint, routePoints[threePoints2], routePoints[threePoints3]);
            onTrack = (nearest < near);
            if (nextNearest < nearest && nextNearest < near) {
                // we have moved on nearer to the next point
                ++nearestPoint;
                // for debug
                //speak(nearestPoint.toString(), routePoints[nearestPoint]);
                onTrack = true;
            }
            if (!onTrack) {
                // need to start looking from scratch again
                nearestPoint = null;
            }
        }
        
        if (onTrack && nearestPoint != null && nearestPoint<routePoints.length) {
            // find the appropriate instruction to provide
            var instruction = routePoints[nearestPoint][2];
            speak(instruction,routePoints[nearestPoint]);

        }
        else if (lastNearestPoint) {
            if (lastNearestPoint >= routePoints.length) {
                lastNearestPoint = routePoints.length - 1;
            }
             // convert offset to multiples of ten metres
            var dist = Math.floor(utils.distanceBetweenCoordinates(thisPoint, routePoints[lastNearestPoint]) / 10) * 10;
            if (dist < far) {
                var bearing = utils.bearingFromCoordinate(thisPoint, routePoints[lastNearestPoint]);
                var warning = offTrack1 + dist + offTrack2 + bearing;
                speak(warning, routePoints[lastNearestPoint]);
            }
        }
        return (onTrack);
    }
    return myMap
})(jQuery )
