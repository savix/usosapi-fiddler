define(function() {
"use strict";


var backend = null;

var Storage = {
    
    get: function(key, defaultValue) {
        return backend.get(key, defaultValue);
    },
    
    set: function(key, value) {
        backend.set(key, value);
    },
    
    addMRU: function(key, item, maxLength, equal) {
        var i, value;
        
        maxLength = maxLength === undefined ? 10 : maxLength;
        equal = equal === undefined ? function(a, b) {return a === b;} : equal;
        
        value = this.get(key, []);
        for (i = 0; i < value.length; i++) {
            if (equal(item, value[i])) {
                value.splice(i, 1);
                break;
            }
        }
        value.unshift(item);
        if (value.length > maxLength) {
            value.splice(maxLength, value.length - maxLength);
        }
        this.set(key, value);
    }
};


function LocalStorageBackend(keyPrefix) {
    this.$keyPrefix = keyPrefix;
}

LocalStorageBackend.prototype = {

    get: function(key, defaultValue) {
        var value = localStorage.getItem(this.$keyPrefix + key);
        try {
            return value === null ? defaultValue : JSON.parse(value);
        } catch (err) {
            return defaultValue;
        }
    },
    
    set: function(key, value) {
        localStorage.setItem(this.$keyPrefix + key, JSON.stringify(value));
    }
};


backend = new LocalStorageBackend("fiddler.");

return {
    Storage: Storage
};

});
