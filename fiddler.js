require(["require", "fiddler/client", "fiddler/method-tab", "fiddler/tab", "fiddler/dialog",
         "fiddler/client-bar", "fiddler/method-index-bar"], function(require) {
"use strict";

var Client = require("fiddler/client").Client;
var SignMode = require("fiddler/client").SignMode;
var Dialog = require("fiddler/dialog").Dialog;
var Tabs = require("fiddler/tab").Tabs;
var MethodTab = require("fiddler/method-tab").MethodTab;
var ClientBar = require("fiddler/client-bar").ClientBar;
var MethodIndexBar = require("fiddler/method-index-bar").MethodIndexBar;

var client;
var tabs = null;
var clientBar = null;
var methodIndexBar = null;

function setupLayout() {
    $("body").layout({
        maskIframesOnResize: true,
        fxName: "none",
        north: {
            resizable: false,
            closable: false,
            size: 90,
            spacing_open: 0
        },
        west: {
            size: 300,
            contentSelector: ".fiddler-content"
        },
        center: {
            contentSelector: ".fiddler-content",
            onresize_end: function() {
                tabs.resize();
            }
        }
    });
}

$(function() {
    setupLayout();

    client = new Client();
    tabs = Tabs.createFromNode($(".fiddler-tabbar").parent());
	clientBar = ClientBar.createFromNode($(".fiddler-clientbar"), client);
    methodIndexBar = MethodIndexBar.createFromNode($(".fiddler-method-index"), client, activateMethod);

    $("#installation-change").click(function() {
        clientBar.updateInstallationMRU();
        methodIndexBar.refresh();
    });
});

function activateMethod(path) {
    client.callMethod({
        path: "services/apiref/method",
        signMode: SignMode.ANONYMOUS,
        params: {name: path},
        success: function(response) {
            var tab = tabs.getActiveTab();
            if (tab === null || tab.isPinned()) {
                tab = new MethodTab(client);
                tabs.addTab(tab);
                tab.activate();
            }
            tab.setMethodInfo(response.getJSON());
        },
        error: function() {
            Dialog.showGenericClientError();
        }
    });
}


});
