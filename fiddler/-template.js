define(["require", "../lib/ejs"], function(require) {
"use strict";

var EJS = require("../lib/ejs").EJS;

function renderTemplate(name, args, helpers) {
    return new EJS({url: "fiddler/template/" + name + ".ejs"}).render(args, helpers);
}


return {
    renderTemplate: renderTemplate
};

});
