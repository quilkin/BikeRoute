var utils = (function ($) {
    "use strict";
    var utils = {};
    var lastLine1, lastLine2, lastDem;

    utils.pointToLine = function(point0, line1, line2) {
        // find min distance from point0 to line defined by points line1 and line2
        // equation from Wikipedia
        var numer, dem;
        var x1 = line1[0], x2 = line2[0], x0 = point0[0];
        var y1 = line1[1], y2 = line2[1], y0 = point0[1];

        if (y1 === y2 && x1 === x2) {
            // function fails if line is a point
            var dist = utils.distanceBetweenCoordinates(point0, line1);
            // convert to approx coords
            return dist / 100000;
        }
        if (line1 === lastLine1 && line2 === lastLine2) {
            // same line as we checked before, can save time by not recalculating sqaure root on demoninator
            dem = lastDem;
        }
        else {
            dem = Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
            lastLine1 = line1;
            lastLine2 = line2;
            lastDem = dem;
        }
        numer = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);

        return numer / dem;

    }
    utils.distanceBetweenCoordinates = function(point0, point1) {
        var x1 = point0[0], x2 = point1[0];
        var y1 = point0[1], y2 = point1[1];
        var R = 6371e3; // metres
        var φ1 = x1 / 57.2958;
        var φ2 = x2 / 57.2958;
        var Δφ = (x2 - x1) / 57.2958;
        var Δλ = (y2 - y1) / 57.2958;

        var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        var d = R * c;
        return d;

    }
    utils.bearingFromCoordinate = function(point0, point1) {

        var x1 = point0[0], x2 = point1[0];
        var y1 = point0[1], y2 = point1[1];
        var dLon = (y2 - y1);
        var y = Math.sin(dLon) * Math.cos(x2);
        var x = Math.cos(x1) * Math.sin(x2) - Math.sin(x1)
                * Math.cos(x2) * Math.cos(dLon);
        var brng = Math.atan2(y, x);
        brng = brng * 57.2958;
        brng = (brng + 360) % 360;

        if (brng < 22.5)
            return 'North';
        if (brng < 67.5)
            return 'North East';
        if (brng < 112.5)
            return 'East';
        if (brng < 157.5)
            return 'South East';
        if (brng < 202.5)
            return 'South';
        if (brng < 247.5)
            return 'South West';
        if (brng < 292.5)
            return 'West';
        if (brng < 337.5)
            return 'North West';
        return 'North';
    }

    // Code from Mapzen site
    utils.polyLineDecode = function(str, precision) {
        var index = 0,
            lat = 0,
            lng = 0,
            coordinates = [],
            shift = 0,
            result = 0,
            byte = null,
            latitude_change,
            longitude_change,
            factor = Math.pow(10, precision || 6);

        // Coordinates have variable length when encoded, so just keep
        // track of whether we've hit the end of the string. In each
        // loop iteration, a single coordinate is decoded.
        while (index < str.length) {

            // Reset shift, result, and byte
            byte = null;
            shift = 0;
            result = 0;

            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);

            latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

            shift = result = 0;

            do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);

            longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

            lat += latitude_change;
            lng += longitude_change;

            coordinates.push([lat / factor, lng / factor]);
        }

        return coordinates;
    };
return utils
})(jQuery)