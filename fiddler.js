require(["require", "fiddler/client", "fiddler/method-tab", "fiddler/util/apiref", "fiddler/config-storage",
         "fiddler/tab", "fiddler/dialog", "fiddler/client-bar"], function(require) {

var Client = require("fiddler/client").Client;
var SignMode = require("fiddler/client").SignMode;
var Dialog = require("fiddler/dialog").Dialog;
var Tabs = require("fiddler/tab").Tabs;
var MethodTab = require("fiddler/method-tab").MethodTab;
var reduceMethodIndex = require("fiddler/util/apiref").reduceMethodIndex;
var Storage = require("fiddler/config-storage").Storage;
var ClientBar = require("fiddler/client-bar").ClientBar;


var client;
var tabs = null;
var clientBar = null;

function setupLayout() {
    $("body").layout({
        defaults: {
            fxName: "none"
        },
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
    
    $("#installation-change").click(function() {
        clientBar.updateInstallationMRU();
        refreshMethodIndex();
    });
});

function refreshMethodIndex() {
    client.callMethod({
        path: "services/apiref/method_index",
        signMode: SignMode.ANONYMOUS,
        success: function(response) {
            var ulNode;
            
            ulNode = reduceMethodIndex(response.getJSON(), function(modulePath, submodules, methods) {
                var ulNode = $("<ul/>").append(submodules).append(methods);
                
                if (modulePath === "services") {
                    return ulNode;
                } else {
                    return $("<li class='fiddler-module'/>").append(
                        $("<span class='fiddler-module-name'/>").text(
                            modulePath.slice(modulePath.lastIndexOf("/") + 1)
                        ).click(function() {
                            $(this).parent().toggleClass("fiddler-collapsed").children("ul").toggle(200);
                        })
                    ).append(
                        ulNode
                    );
                }
            }, function(modulePath, method) {
                var methodName = method.name.slice(modulePath.length + 1);
                
                return $("<li class='fiddler-method'/>").append(
                    $("<a href=\"#\"/>").text(methodName).click(function() {
                        activateMethod(method.name);
                    }).attr("title", method.brief_description)
                );
            });
            
            $(".fiddler-method-index").empty().append(ulNode).tooltip({show: false, hide: false});
        },
        error: function() {
            Dialog.showGenericClientError();
        }
    });
}

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
