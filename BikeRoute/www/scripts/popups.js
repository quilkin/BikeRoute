/*global jQuery*/

var popup = (function ($) {

    "use strict";

    var popupCount = 0,
        //$popUp,

    // constructor
        pop = function (title) {

            if (popupCount > 4) {
                alert("Too many popups");
                popupCount = 0;
                //return null;
            }
            this.$popUp = $("<div class='ui-content'/>").popup({
                dismissible: false,
                theme: "c"

            }).on("popupafterclose", function () {
                $(this).remove();
                if (popupCount > 0) { --popupCount; }
            });
            $("<h4/>", { text: title }).appendTo(this.$popUp);
            ++popupCount;

            this.addMenuItem = function (text, func, param1, param2) {
                var self = this.$popUp;
                $("<a/>", {
                    text: text
                }).buttonMarkup({
                    inline: true,
                    theme: "b"
                }).on("click", function () {
                    self.popup("close");
                    if (func !== null && func !== undefined) {
                        func(param1, param2);
                    }

                }).appendTo(self);
            };
            this.open = function () {
                // $popUp.popup("open").trigger("create");
                this.$popUp.popup("open");
            };
            //};
            //this.alert = function (alertstr) {
            //    var popup = new pop(alertstr);
            //    popup.addMenuItem('OK', null);
            //    popup.open();
            //};

            
            //this.confirm = function (question, yesfunc, nofunc) {
            //    var popup = new pop(question);
            //    popup.addMenuItem('yes', yesfunc);
            //    popup.addMenuItem('no', nofunc);
            //    popup.open();
            //};


        };
    pop.alert = function (alertstr) {
        var popup = new pop(alertstr);
        popup.addMenuItem('OK', null);
        popup.open();
    };
    //  wait for popup to be answered before running function
    pop.wait = function (message, func) {
        var popup = new pop(message);
        popup.addMenuItem('OK', func);
        popup.open();
    };
    // wait for question to be answered before running function(s)
    pop.confirm = function (question, yesfunc, nofunc) {
                var popup = new pop(question);
                popup.addMenuItem('yes', yesfunc);
                popup.addMenuItem('no', nofunc);
                popup.open();
    };
    pop.prototype = {
        count: function () {

            return popupCount;

        }
    }
    return pop;
}(jQuery));
