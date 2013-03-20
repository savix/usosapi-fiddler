define(["require", "./util/dom", "./resource", "./-template"], function(require) {
"use strict";

var generateUniqueId = require("./util/dom").generateUniqueId;
var getResourceURL = require("./resource").getResourceURL;
var renderTemplateBase = require("./-template").renderTemplate;


var HELPERS = {
    generateUniqueId: generateUniqueId,
    resourceURL: getResourceURL
};

function renderTemplate(name, args) {
    return renderTemplateBase(name, args, HELPERS);
}


return {
    renderTemplate: renderTemplate
};

});
