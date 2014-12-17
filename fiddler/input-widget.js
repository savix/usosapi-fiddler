define(function(require) {
"use strict";

var fetchParamFieldNames = require("./apiref/field-extractor").fetchParamFieldNames;


function getFieldPath(fieldSelector) {
    var parts = fieldSelector.split(/([\[\]\|])/g),
        path = [parts[0]],
        i;

    for (i = 1; i < parts.length; i += 2) {
        if (parts[i] === "[") {
            path.push("");
        } else if (parts[i] === "]" && path.length > 1) {
            path.pop();
        }
        path[path.length - 1] = parts[i + 1];
    }

    return path;
}

function FieldsInput(name, placeholder, client, methodPath) {
    this.$name = name;
    this.$node = $("<input/>").attr("name", name).autocomplete({
        minLength: 0,
        source: function(request, response) {
            var fieldPath = getFieldPath(request.term);
            fetchParamFieldNames(client, methodPath, name, fieldPath.slice(0, -1), function(fieldNames) {
                response($.ui.autocomplete.filter(fieldNames, fieldPath[fieldPath.length - 1]));
            });
        },
        focus: function() {
            return false;
        },
        select: function(event, ui) {
            var fields = this.value, match = fields.match(/[^\[\]\|]*$/);

            fields = fields.slice(0, fields.length - match[0].length);
            if (fields.slice(-1) === "]") {
                fields += "|";
            }
            this.value = fields + ui.item.value;
            return false;
        }
    }).focus(function() {
        $(this).autocomplete("search", this.value);
    });
    if (placeholder) {
        this.$node.attr("placeholder", placeholder);
    }
    this.$methodPath = methodPath;
}

FieldsInput.createFromParamInfo = function(paramInfo, methodPath, client) {
    return new FieldsInput(paramInfo.name, paramInfo.default_value, client, methodPath);
};

FieldsInput.prototype = {

    getValue: function() {
        return this.$node.val() || null;
    },

    getNode: function() {
        return this.$node;
    },

    getName: function() {
        return this.$name;
    }
};

function InputWidget() {

}

var paramConstructorMap = {
    "services/mailing/send_simple_message#content": TextareaInput,
    "services/mailing/send_simple_by_template#content_template": TextareaInput,
    "services/mailing/send_simple_messages#param_sets": TextareaInput,
    "services/blobbox/put_unsigned#data": FileInput,
    "services/minefield/file_echo#data": FileInput,
    "services/prgroups/primary_group#primary_group_id": EmptyStringInput,
    "services/prgroups/primary_groups#primary_group_ids": EmptyStringInput,
    "services/prgroups/create_descriptor#source": TextareaInput,
    "services/prgroups/update_descriptor#source": TextareaInput,
    "services/mailclient/put_attachment#data": FileInput
};

InputWidget.createFromParamInfo = function(paramInfo, methodPath, client) {
    var constructor;

    if (paramInfo.name === "fields") {
        constructor = FieldsInput;
    } else {
        constructor = paramConstructorMap[methodPath + "#" + paramInfo.name] || StringInput;
    }

    return constructor.createFromParamInfo(paramInfo, methodPath, client);
};

function StringInput(name, placeholder) {
    this.$name = name;
    this.$node = $("<input/>").attr("name", name);
    if (placeholder) {
        this.$node.attr("placeholder", placeholder);
    }
}

StringInput.createFromParamInfo = function(paramInfo) {
    return new StringInput(paramInfo.name, paramInfo.default_value);
};

StringInput.prototype = {

    getValue: function() {
        return this.$node.val() || null;
    },

    getNode: function() {
        return this.$node;
    },

    getName: function() {
        return this.$name;
    }
};

function EmptyStringInput(name, placeholder) {
    StringInput.call(this, name, placeholder);
}

EmptyStringInput.createFromParamInfo = function(paramInfo) {
    return new EmptyStringInput(paramInfo.name, paramInfo.default_value);
};

EmptyStringInput.prototype = $.extend(Object.create(StringInput.prototype), {
    getValue: function() {
        return this.$node.val();
    }
});

function TextareaInput(name) {
    this.$name = name;
    this.$node = $("<textarea cols='50' rows='10'></textarea>");
}

TextareaInput.createFromParamInfo = function(paramInfo) {
    return new TextareaInput(paramInfo.name);
};

TextareaInput.prototype = {

    getValue: function() {
        return this.$node.val() || null;
    },

    getNode: function() {
        return this.$node;
    },

    getName: function() {
        return this.$name;
    }
};

function FileInput(name) {
    this.$name = name;
    this.$node = $("<input type='file'/>");
}

FileInput.createFromParamInfo = function(paramInfo) {
    return new FileInput(paramInfo.name);
};

FileInput.prototype = {

    getValue: function() {
        return this.$node[0].files[0] || null;
    },

    getNode: function() {
        return this.$node;
    },

    getName: function() {
        return this.$name;
    }
};

function ChoiceInput(name, choices, defaultChoice) {
    var node;

    this.$name = name;
    this.$node = node = $("<select/>").attr("name", name);
    $.each(choices, function(i, choice) {
        node.append($("<option/>").attr("selected", choice === defaultChoice).attr("value", choice).text(choice));
    });
}

ChoiceInput.prototype = {

    getValue: function() {
        return this.$node.val() || null;
    },

    getNode: function() {
        return this.$node;
    },

    getName: function() {
        return this.$name;
    }
};


return {
    InputWidget: InputWidget,
    StringInput: StringInput,
    TextareaInput: TextareaInput,
    FileInput: FileInput,
    ChoiceInput: ChoiceInput
};

});
