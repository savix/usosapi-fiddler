define(function() {
"use strict";


var URL = {

    parseQuery: function(query) {
        var result = {};
        if (query[0] === "?") {
            query = query.slice(1);
        }
        if (query === "") {
            return result;
        }
        query.split("&").forEach(function(item) {
            var pos = item.indexOf("=");
            result[decodeURIComponent(item.slice(0, pos))] = decodeURIComponent(item.slice(pos + 1));
        });
        return result;
    }
};


return {
    URL: URL
};

});
