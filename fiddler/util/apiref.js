define(function() {
"use strict";


function reduceMethodIndex(methodIndex, moduleCallback, methodCallback) {
    var i = 0;
    function processModule(prefix) {
        var pos, methods = [], submodules = [];
        while (i < methodIndex.length && methodIndex[i].name.slice(0, prefix.length) === prefix) {
            pos = methodIndex[i].name.indexOf("/", prefix.length);
            if (pos === -1) {
                methods.push(methodCallback(prefix.slice(0, -1), methodIndex[i]));
                i++;
            } else {
                submodules.push(processModule(methodIndex[i].name.slice(0, pos + 1)));
            }
        }
        return moduleCallback(prefix.slice(0, -1), submodules, methods);
    }
    
    methodIndex = methodIndex.slice();
    methodIndex.sort(function(a, b) {
        return a.name < b.name ? -1 : 1;
    });
    return processModule("services/");
}


return {
    reduceMethodIndex: reduceMethodIndex
};

});

