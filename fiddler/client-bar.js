define(["require", "./config-storage", "./client", "./template", "./dialog"], function(require) {
"use strict";

var Storage = require("./config-storage").Storage;
var SignMode = require("./client").SignMode;
var Client = require("./client").Client;
var renderTemplate = require("./template").renderTemplate;
var Dialog = require("./dialog").Dialog;


function ClientBar(node, client) {
    this.$client = client;
    this.$tokenPane = new TokenPane(this, node);
    this.$consumerPane = new ConsumerPane(this, node);
    this.$installationPane = new InstallationPane(this, node);
}

ClientBar.createFromNode = function(node, client) {
    return new ClientBar(node, client);
};

ClientBar.prototype = {
    updateInstallationMRU: function() {
        this.$installationPane.updateInstallationMRU();
    }
};


function TokenPane(bar, node) {
    var paneNode, keyNode, secretNode, userIdNode, acquireNode;

    paneNode = node.find(".fiddler-pane.fiddler-token");
    userIdNode = paneNode.find(".fiddler-user-id");
    keyNode = paneNode.find(".fiddler-key");
    secretNode = paneNode.find(".fiddler-secret");
    acquireNode = paneNode.find(".fiddler-acquire");

    this.$bar = bar;
    this.$paneNode = paneNode;
    this.$keyNode = keyNode;
    this.$secretNode = secretNode;
    this.$userIdNode = userIdNode;
    this.$mode = "keySecret";

    if (keyNode.val() || secretNode.val()) {
        userIdNode.val("");
        this.$keySecretChanged();
    } else if (userIdNode.val()) {
        this.$setMode("userId");
        this.$userIdChanged();
    } else {
        this.setToken(Storage.get("token", null));
    }

    keyNode.change(this.$keySecretChanged.bind(this));
    secretNode.change(this.$keySecretChanged.bind(this));
    userIdNode.change(this.$userIdChanged.bind(this));
    paneNode.find("a.fiddler-for-key-secret").click(this.$userIdChanged.bind(this));
    paneNode.find("a.fiddler-for-user-id").click(this.$keySecretChanged.bind(this));
    acquireNode.click(this.acquireAccessToken.bind(this));
}

TokenPane.prototype = {
    getClient: function() {
        return this.$bar.$client;
    },

    setToken: function(token) {
        this.getClient().setToken(token);
        Storage.set("token", token);
        if (token === null) {
            if (this.$mode === "keySecret") {
                this.$keyNode.val("");
                this.$secretNode.val("");
            } else {
                this.$userIdNode.val("");
            }
        } else if (token.userId) {
            this.$userIdNode.val(token.userId);
            this.$setMode("userId");
        } else {
            this.$keyNode.val(token.key);
            this.$secretNode.val(token.secret);
            this.$setMode("keySecret");
        }
    },

    $setMode: function(mode) {
        if (this.$mode === mode) {
            return;
        }
        this.$paneNode.find(getTokenModeSelector(this.$mode)).hide();
        this.$paneNode.find(getTokenModeSelector(mode)).show();
        this.$mode = mode;
    },

    $keySecretChanged: function() {
        var key = this.$keyNode.val().trim(),
            secret = this.$secretNode.val().trim(),
            token;

        this.$setMode("keySecret");
        this.$keyNode.val(key);
        this.$secretNode.val(secret);
        if (isTokenKey(key) && isTokenSecret(secret)) {
            token = {key: key, secret: secret};
        } else if (!key && !secret) {
            token = null;
        } else {
            return;
        }
        this.getClient().setToken(token);
        Storage.set("token", token);
    },

    $userIdChanged: function() {
        var userId = this.$userIdNode.val().trim(),
            token;

        this.$setMode("userId");
        this.$userIdNode.val(userId);
        if (isTokenUserId(userId)) {
            token = {userId: parseInt(userId, 10)};
        } else if (!userId) {
            token = null;
        } else {
            return;
        }
        this.getClient().setToken(token);
        Storage.set("token", token);
    },

    acquireAccessToken: function() {
        var that = this;

        this.getClient().callMethod({
            path: "services/apiref/scopes",
            signMode: SignMode.ANONYMOUS,
            success: function(response) {
                var dialog = $(
                    renderTemplate("scope-dialog", {scopes: response.getJSON()})
                ).dialog({
                    modal: true,
                    width: 800,
                    buttons: {
                        "OK": function() {
                            var scopes = [];

                            dialog.serializeArray().forEach(function(item) {
                                if (item.name === "scopes[]") {
                                    scopes.push(item.value);
                                }
                            });
                            dialog.dialog("close").remove();

                            Storage.set("scopes", scopes);
                            that.getClient().acquireAccessToken({
                                scopes: scopes,
                                success: function(token) {
                                    that.setToken(token);
                                },
                                error: function() {
                                    Dialog.showGenericClientError();
                                }
                            });
                        }
                    },
                    close: function() {
                        dialog.remove();
                    }
                });
                Storage.get("scopes", []).forEach(function(scope) {
                    dialog.find('input[name="scopes[]"][value="' + scope + '"]').prop("checked", true);
                });
            },
            error: function() {
                Dialog.showGenericClientError();
            }
        });
    }
};

function getTokenModeSelector(mode) {
    return mode === "keySecret" ? ".fiddler-for-key-secret" : ".fiddler-for-user-id";
}

function isTokenKey(value) {
    return !!value;
}

function isTokenSecret(value) {
    return !!value;
}

function isTokenUserId(value) {
    return (/[1-9]\d*/).test(value);
}


function ConsumerPane(bar, node) {
    var paneNode, keyNode, secretNode, clearNode, that = this;

    paneNode = node.find(".fiddler-pane.fiddler-consumer");
    keyNode = paneNode.find(".fiddler-key");
    secretNode = paneNode.find(".fiddler-secret");
    clearNode = paneNode.find(".fiddler-clear");

    this.$bar = bar;
    this.$keyNode = keyNode;
    this.$secretNode = secretNode;

    if (keyNode.val() || secretNode.val()) {
        this.$changed();
    } else {
        this.setConsumer(Storage.get("consumer", null));
    }

    this.$keyNode.change(this.$changed.bind(this));
    secretNode.change(this.$changed.bind(this));
    clearNode.click(function() {
        that.setConsumer(null);
    });
}

ConsumerPane.prototype = {
    getClient: function() {
        return this.$bar.$client;
    },

    setConsumer: function(consumer) {
        this.$keyNode.val(consumer && consumer.key || "");
        this.$secretNode.val(consumer && consumer.secret || "");
        this.getClient().setConsumer(consumer);
        Storage.set("consumer", consumer);
    },

    $changed: function() {
        var key = this.$keyNode.val().trim(),
            secret = this.$secretNode.val().trim(),
            consumer;

        this.$keyNode.val(key);
        this.$secretNode.val(secret);
        if (isConsumerKey(key) && isConsumerSecret(secret)) {
            consumer = {key: key, secret: secret};
        } else if (!key && !secret) {
            consumer = null;
        } else {
            return;
        }
        this.getClient().setConsumer(consumer);
        Storage.set("consumer", consumer);
    }

};

function isConsumerKey(value) {
    return !!value;
}

function isConsumerSecret(value) {
    return !!value;
}

$.widget("custom.installationAutocomplete", $.ui.autocomplete, {
    _renderItem: function(ul, item) {
        var aNode = $("<a/>").text(item.url).append("<br/>");
        if (item.name) {
            aNode.append($("<small/>").text(item.name));
        }
        return $("<li/>").append(aNode).appendTo(ul);
    }
});

function InstallationPane(bar, node) {
    var paneNode, baseURLNode, that = this;

    paneNode = node.find(".fiddler-pane.fiddler-installation");
    baseURLNode = paneNode.find(".fiddler-base-url");

    this.$bar = bar;
    this.$paneNode = paneNode;
    this.$baseURLNode = baseURLNode;
    this.$installationNames = {};
    this.$installationURLs = [];

    if (baseURLNode.val()) {
        this.$changed();
    } else {
        this.setInstallation(Storage.get("installation", null));
    }

    baseURLNode.change(
        this.$changed.bind(this)
    ).installationAutocomplete({
        delay: 0,
        minLength: 0,
        source: this.$getAutocompleteSource(),
        change: this.$changed.bind(this)
    }).focus(function() {
        $(this).installationAutocomplete("search", this.value);
    });

    new Client(Client.MOTHER_BASE_URL).callMethod({
        path: "services/apisrv/installations",
        success: function(response) {
            response.getJSON().forEach(function(installation) {
                var url = installation.base_url.replace(/^http:/, "https:");
                that.$installationNames[url] = installation.institution_name.en || installation.institution_name.pl;
                that.$installationURLs.push(url);
            });
            that.$autocompleteSourceChanged();
        }
    });
}


InstallationPane.prototype = {
    getClient: function() {
        return this.$bar.$client;
    },

    setInstallation: function(installation) {
        this.$baseURLNode.val(installation && installation.baseURL || "");
        this.getClient().setBaseURL(installation ? installation.baseURL : null);
        Storage.set("installation", installation);
    },

    $getAutocompleteSource: function() {
        var mruURLs = {}, source = [], that = this;

        function addEntry(url) {
            var name = that.$installationNames[url];
            source.push({
                label: url,
                url: url,
                name: name
            });
        }

        Storage.get("installationMRU", []).forEach(function(installation) {
            mruURLs[installation.baseURL] = true;
            addEntry(installation.baseURL);
        });

        this.$installationURLs.forEach(function(url) {
            if (!mruURLs[url]) {
                addEntry(url);
            }
        });

        return source;
    },

    $autocompleteSourceChanged: function() {
        this.$baseURLNode.installationAutocomplete("option", "source", this.$getAutocompleteSource());
    },

    updateInstallationMRU: function() {
        var baseURL = this.$baseURLNode.val().trim();

        if (isBaseURL(baseURL)) {
            Storage.addMRU("installationMRU", {baseURL: baseURL}, 10, function(a, b) {
                return a.baseURL === b.baseURL;
            });
            this.$autocompleteSourceChanged();
        }
    },

    $changed: function() {
        var baseURL = this.$baseURLNode.val().trim(), installation;

        this.$baseURLNode.val(baseURL);
        if (isBaseURL(baseURL)) {
            installation = {baseURL: baseURL};
        } else if (!baseURL) {
            installation = null;
        } else {
            return;
        }
        this.getClient().setBaseURL(installation ? installation.baseURL : null);
        Storage.set("installation", installation);
    }
};


function isBaseURL(value) {
    return !!value; // TODO check if valid URL
}


return {
    ClientBar: ClientBar
};

});
