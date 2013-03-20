define(function() {


var EJS = {
    Scanner: {
        to_text: function(input){
	        if(input == null || input === undefined)
                return '';
            if(input instanceof Date)
		        return input.toDateString();
	        if(input.toString) 
                return input.toString();
	        return '';
        }
    }
}

var TEMPLATES = /* @echo templates */;

function renderTemplate(name, args, helpers) {
    return TEMPLATES[name].call(args, args || {}, helpers);
}


return {
    renderTemplate: renderTemplate
};

});
