define(["require", "./util/url"], function(require) {
"use strict";

var URL = require("./util/url").URL;


function Response(xhr) {
    var that = this;

    this.$xhr = xhr;
    this.$fr = null;
    this.$text = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;

    xhr.onload = function() {
        that.$prepareText(true);
    };
    xhr.onabort = function() {
        that.$aborted();
    };
    xhr.onerror = function() {
        that.$prepareText(false);
    };
}

Response.prototype = {
    getStatus: function() {
        return this.$xhr.status;
    },

    abort: function() {
        if (this.$fr === null) {
            this.$xhr.abort();
        } else {
            this.$fr.abort();
        }
    },

    getText: function() {
        return this.$text;
    },

    getJSON: function() {
        return JSON.parse(this.getText());
    },

    getBlob: function() {
        return this.$xhr.response;
    },

    $prepareText: function(success) {
        var that = this;

        if (this.$isTextContentType(this.$xhr.getResponseHeader("Content-Type"))) {
            this.$fr = new FileReader();
            this.$fr.onload = function() {
                that.$text = that.$fr.result;
                that.$completed(true);
            };
            this.$fr.onerror = function() {
                that.$completed(false);
            };
            this.$fr.onabort = function() {
                that.$aborted();
            };
            this.$fr.readAsText(this.$xhr.response);
        } else {
            this.$completed(success);
        }
    },

    $isTextContentType: function(contentType) {
        if (! contentType) {
            return false;
        }
        if (contentType.indexOf("text/") === 0) {
            return true;
        }
        if (contentType.indexOf("application/json") === 0) {
            return true;
        }
        return false;
    },

    $completed: function(success) {
        var handler = success ? this.onload : this.onerror;
        if (handler !== null) {
            handler(this);
        }
    },

    $aborted: function() {
        if (this.onabort !== null) {
            this.onabort(this);
        }
    }
};


var SignMode = {
    ANONYMOUS: "anonymous",
    CONSUMER: "consumer",
    TOKEN: "token",

    ALL: ["anonymous", "consumer", "token"],

    compare: function (left, right) {
        return SignMode.ALL.indexOf(left) - SignMode.ALL.indexOf(right);
    }
};


function Client(baseURL) {
    baseURL = baseURL === undefined ? null : baseURL;

    this.$baseURL = baseURL;
    this.$consumerKey = null;
    this.$consumerSecret = null;
    this.$tokenKey = null;
    this.$tokenSecret = null;
    this.$asUserId = null;
}

Client.MOTHER_BASE_URL = "https://apps.usos.edu.pl/";

Client.$requestTokenOptions = {};
Client.$requestTokenCounter = 0;

Client.requestTokenAuthorized = function(requestId, verifier) {
    var opts = Client.$requestTokenOptions[requestId];

    opts.client.setToken({key: opts.tokenKey, secret: opts.tokenSecret});
    opts.client.callMethod({
        path: "services/oauth/access_token",
        params: {oauth_verifier: verifier},
        complete: function(response) {
            var data;

            if (response.getStatus() !== 200) {
                opts.error(response);
            } else {
                data = URL.parseQuery(response.getText());
                opts.success({key: data.oauth_token, secret: data.oauth_token_secret});
            }
        }
    });
};

Client.requestTokenDenied = function(requestId) {
    var opts = Client.$requestTokenOptions[requestId];

    opts.deny();
};

Client.prototype = {

    getBaseURL: function() {
        return this.$baseURL;
    },

    setBaseURL: function(url) {
        this.$baseURL = url;
    },

    hasBaseURL: function() {
        return this.$baseURL !== null;
    },

    setConsumer: function(consumer) {
        if (consumer === null) {
            this.clearConsumer();
        } else {
            this.$consumerKey = consumer.key;
            this.$consumerSecret = consumer.secret;
        }
    },

    hasConsumer: function() {
        return this.$consumerKey !== null;
    },

    clearConsumer: function() {
        this.$consumerKey = null;
        this.$consumerSecret = null;
    },

    setToken: function(token) {
        var tokenKey = null,
            tokenSecret = null,
            asUserId = null;

        if (token !== null) {
            if (token.userId) {
                asUserId = token.userId;
            } else {
                tokenKey = token.key;
                tokenSecret = token.secret;
            }
        }
        this.$tokenKey = tokenKey;
        this.$tokenSecret = tokenSecret;
        this.$asUserId = asUserId;
    },

    getToken: function() {
        if (this.$tokenKey !== null) {
            return {key: this.$tokenKey, secret: this.$tokenSecret};
        } else if ( this.$asUserId !== null) {
            return {userId: this.$asUserId};
        } else {
            return null;
        }
    },

    hasToken: function() {
        return this.$tokenKey !== null || this.$asUserId !== null;
    },

    copy: function () {
        var copy = new Client();
        copy.$baseURL = this.$baseURL;
        copy.$consumerKey = this.$consumerKey;
        copy.$consumerSecret = this.$consumerSecret;
        copy.$tokenKey = this.$tokenKey;
        copy.$tokenSecret = this.$tokenSecret;
        copy.$asUserId = this.$asUserId;

        return copy;
    },

    $getAuthParams: function(includeToken) {
        var params = {
            oauth_consumer_key: this.$consumerKey,
            oauth_signature_method: "PLAINTEXT",
            oauth_signature: this.$consumerSecret + "&",
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_nonce: this.$generateNonce(),
            oauth_version: "1.0"
        };
        if (this.$tokenKey && includeToken) {
            params.oauth_token = this.$tokenKey;
            params.oauth_signature += this.$tokenSecret;
        }

        return params;
    },

    $generateNonce: function() {
        return Math.floor(Math.random() * 1000000000).toString();
    },

    $getAuthHeader: function(includeToken) {
        var result = "OAuth ";
        $.each(this.$getAuthParams(includeToken), function(key, value) {
            result += key + "=\"" + encodeURIComponent(value) + "\", ";
        });
        return result.slice(0, -2);
    },

    $prepareParams: function(params) {
        var formData,
            keys = Object.keys(params).filter(function(key) {return params[key] !== null; });

        if (keys.length === 0) {
            return null;
        } else if (keys.every(function(key) {return typeof(params[key]) === "string"; })) {
            return $.param(keys.map(function(key) {
                return {name: key, value: params[key]};
            }));
        } else {
            formData = new FormData();
            keys.forEach(function(key) {
                formData.append(key, params[key]);
            });
            return formData;
        }
    },

    callMethod: function(opts) {
        var response, params, xhr;

        opts = $.extend({
            path: undefined,
            params: {},
            complete: function() {},
            error: function() {},
            success: function() {},
            abort: function() {},
            signMode: null
        }, opts);

        if (opts.signMode === null) {
            if (this.hasConsumer()) {
                if (this.hasToken()) {
                    opts.signMode = SignMode.TOKEN;
                } else {
                    opts.signMode = SignMode.CONSUMER;
                }
            } else {
                opts.signMode = SignMode.ANONYMOUS;
            }
        } else {
            if (opts.signMode !== SignMode.ANONYMOUS && !this.hasConsumer()) {
                throw new Error("Missing consumer");
            }
            if (opts.signMode === SignMode.TOKEN && !this.hasToken()) {
                throw new Error("Missing token");
            }
        }

        xhr = new XMLHttpRequest();
        response = new Response(xhr);

        response.onload = function() {
            opts.success(response);
            opts.complete(response);
        };
        response.onabort = function() {
            opts.abort(response);
        };
        response.onerror = function() {
            opts.error(response);
            opts.complete(response);
        };

        xhr.open("POST", this.$baseURL + opts.path);
        if (opts.signMode !== SignMode.ANONYMOUS) {
            xhr.setRequestHeader("Authorization", this.$getAuthHeader(opts.signMode === SignMode.TOKEN));
        }
        xhr.responseType = "blob";

        params = $.extend({}, opts.params);
        if (opts.signMode === SignMode.TOKEN && this.$asUserId) {
            params.as_user_id = this.$asUserId;
        }
        params = this.$prepareParams(params);

        if (params === null) {
            xhr.setRequestHeader("Content-Type", "text/plain");
        } else if (typeof params === "string") {
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        }

        if (params === null) {
            xhr.send();
        } else {
            xhr.send(params);
        }

        return response;
    },

    $getAuthorizedCallback: function() {
        var callback = String(document.location);
        callback = callback.slice(0, callback.lastIndexOf("/"));
        callback += "/authorized.html";

        return callback;
    },

    acquireAccessToken: function(opts) {
        var id;

        opts = $.extend({
            scopes: [],
            success: function() {},
            deny: function() {},
            error: function() {}
        }, opts);
        opts.client = this.copy();
        id = Client.$requestTokenCounter++;

        opts.client.callMethod({
            path: "services/oauth/request_token",
            params: {
                oauth_callback: this.$getAuthorizedCallback() + "?request_id=" + id,
                scopes: opts.scopes.join("|")
            },
            complete: function(response) {
                var data;

                if (response.getStatus() !== 200) {
                    opts.error(response);
                } else {
                    data = URL.parseQuery(response.getText());

                    opts.tokenKey = data.oauth_token;
                    opts.tokenSecret = data.oauth_token_secret;
                    Client.$requestTokenOptions[id] = opts;

                    window.open(
                        opts.client.getBaseURL() + "services/oauth/authorize?oauth_token=" + data.oauth_token,
                        null,
                        "menubar=1,resizable=1,width=800,height=600"
                    );
                }
            },
            signMode: SignMode.CONSUMER
        });
    }

};

// Client must be globally exported to receive authentication info when acquiring access token.
window.FiddlerClient = Client;


return {
    Client: Client,
    SignMode: SignMode
};

});
