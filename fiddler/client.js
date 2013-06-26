define(["require", "./util/url"], function(require) {
"use strict";

var URL = require("./util/url").URL;


function Response(xhr) {
    this.$xhr = xhr;
}

Response.prototype = {
    getText: function() {
        return this.$xhr.responseText;
    },

    getJSON: function() {
        return JSON.parse(this.getText());
    },

    getStatus: function() {
        return this.$xhr.status;
    },

    abort: function() {
        this.$xhr.abort();
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
        var response, headers, params;

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

        params = $.extend({}, opts.params);
        if (opts.signMode === SignMode.TOKEN && this.$asUserId) {
            params.as_user_id = this.$asUserId;
        }
        params = this.$prepareParams(params);

        headers = {};
        if (params === null) {
            headers["Content-Type"] = "text/plain";
        } else if (typeof params === "string") {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
        } else {
            // When FormData is used, Content-Type is set properly.
        }
        if (opts.signMode !== SignMode.ANONYMOUS) {
            headers.Authorization = this.$getAuthHeader(opts.signMode === SignMode.TOKEN);
        }

        response = new Response($.ajax({
            url: this.$baseURL + opts.path,
            method: "POST",
            data: params,
            dataType: "text",
            processData: false,
            contentType: false,
            headers: headers,
            complete: function(jqXHR, textStatus) {
                switch (textStatus) {
                case "success":
                    opts.success(response);
                    opts.complete(response);
                    break;

                case "abort":
                    opts.abort(response);
                    break;

                case "error":
                    opts.error(response);
                    opts.complete(response);
                    break;

                default:
                    throw new Error("Unsupported textStatus value: " + textStatus);
                }
            }
        }));

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
