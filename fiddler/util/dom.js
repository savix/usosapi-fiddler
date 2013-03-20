define(function() {
"use strict";


function generateUniqueId() {
    return "uniqueid-" + generateUniqueId.$counter++;
}

generateUniqueId.$counter = 1;


return {
    generateUniqueId: generateUniqueId
};

});
