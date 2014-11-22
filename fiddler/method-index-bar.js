define(["require", "./util/apiref", "./client", "./dialog"], function(require) {
"use strict";

var reduceMethodIndex = require("./util/apiref").reduceMethodIndex;
var SignMode = require("./client").SignMode;
var Dialog = require("./dialog").Dialog;

var FILTER_DELAY = 500;

function MethodIndexBar(node, client, activate) {
    this.$node = node;
    this.$filterNode = node.parent().find(".fiddler-method-search-form input");
    this.$filterTimer = null;
    this.$client = client;
    this.$activate = activate;

    this.$filterNode.keypress(this.$scheduleFilter.bind(this));
}

MethodIndexBar.createFromNode = function(node, client, activate) {
    return new MethodIndexBar(node, client, activate);
};

MethodIndexBar.prototype = {

    $scheduleFilter: function() {
        if (!this.$filterTimer) {
            this.$filterTimer = setTimeout(this.$runFilter.bind(this), FILTER_DELAY);
        }
    },

    $runFilter: function() {
        clearTimeout(this.$filterTimer);
        this.$filterTimer = null;

        var query = this.$filterNode.val();

        function match(label) {
            return label.indexOf(query) !== -1;
        }

        function visitListItems(ul, prefix) {
            return ul.children("li").map(function(i, li) {
                var label, foundDescendant;

                li = $(li);
                if (li.hasClass("fiddler-module")) {
                    label = prefix + li.children(".fiddler-module-name").text() + "/";
                    if (match(label)) {
                        li.css({display: ""});
                        li.find("li").css({display: ""});
                        return true;
                    } else {
                        foundDescendant = visitListItems(li.children("ul"), label);
                        if (foundDescendant) {
                            li.css({display: ""});
                            return true;
                        } else {
                            li.css({display: "none"});
                            return false;
                        }
                    }
                } else {
                    if (match(prefix + li.text())) {
                        li.css({display: ""});
                        return true;
                    } else {
                        li.css({display: "none"});
                        return false;
                    }
                }
            }).get().reduce(function(prev, cur) {return prev || cur;}, false);
        }

        visitListItems(this.$node.children("ul"), "services/");
    },

    refresh: function() {
        var that = this;

        this.$client.callMethod({
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
                        $("<a href=\"#\"/>").text(methodName).click(function(event) {
                            event.preventDefault();
                            that.$activate(method.name);
                        }).attr("title", method.brief_description)
                    );
                });

                that.$node.empty().append(ulNode).tooltip({show: false, hide: false});
                that.$runFilter();
            },
            error: function() {
                Dialog.showGenericClientError();
            }
        });
    }
};

return {
    MethodIndexBar: MethodIndexBar
};

});
