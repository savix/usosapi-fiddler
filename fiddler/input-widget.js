define(function() {
"use strict";


function InputWidget() {

}

InputWidget.createFromParamInfo = function(paramInfo, methodPath) {
    var constructor = {
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
    }[methodPath + "#" + paramInfo.name] || StringInput;
    
    return constructor.createFromParamInfo(paramInfo);
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
