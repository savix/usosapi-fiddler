define(function() {
"use strict";


function prettifyXML(xml) {
    var formatted = '';
    var reg = /(>)(<)(\/*)/g; /* gEdit fix */
    xml = xml.replace(reg, '$1\r\n$2$3');
    var pad = 0;
    jQuery.each(xml.split('\r\n'), function(index, node) {
        var indent = 0;
        if (node.match( /.+<\/\w[^>]*>$/ )) {
            indent = 0;
        } else if (node.match( /^<\/\w/ )) {
            if (pad !== 0) {
                pad -= 1;
            }
        } else if (node.match( /^<\w[^>]*[^\/]>.*$/ )) {
            indent = 1;
        } else {
            indent = 0;
        }

        var padding = '';
        for (var i = 0; i < pad; i++) {
            padding += '    ';
        }

        formatted += padding + node + '\r\n';
        pad += indent;
    });

    return formatted;
}

function prettifyJSON(value) {
    return JSON.stringify(JSON.parse(value), null, 4);
}


return {
    prettifyXML: prettifyXML,
    prettifyJSON: prettifyJSON
};

});
