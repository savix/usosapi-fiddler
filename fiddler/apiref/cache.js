define(function(require) {
"use strict";

var SignMode = require("../client").SignMode;


var apirefCacheInstance = null;

function ApirefCache() {
    this.$methodInfos = null;
    this.$baseURL = null;
}

ApirefCache.getInstance = function() {
    if (!apirefCacheInstance) {
        apirefCacheInstance = new ApirefCache();
    }
    return apirefCacheInstance;
};

ApirefCache.fetchMethodInfo = function(client, methodPath, success, error) {
    ApirefCache.getInstance().fetchMethodInfo(client, methodPath, success, error);
};

ApirefCache.prototype = {

    fetchMethodInfo: function(client, methodPath, success, error) {
        var clientBaseURL = client.getBaseURL();

        if (this.$baseURL !== clientBaseURL) {
            this.$baseURL = clientBaseURL;
            this.$methodInfos = {};
        } else if (methodPath in this.$methodInfos) {
            success(this.$methodInfos[methodPath]);
            return;
        }

        client.callMethod({
            path: "services/apiref/method",
            params: {name: methodPath},
            signMode: SignMode.ANONYMOUS,
            complete: function(response) {
                var result;

                if (response.getStatus() === 200) {
                    result = response.getJSON();
                    if (this.$baseURL === clientBaseURL) {
                        this.$methodInfos[methodPath] = result;
                    }
                    success(result);
                } else {
                    error(response);
                }
            }
        });
    }
};


return {
    ApirefCache: ApirefCache
};

});