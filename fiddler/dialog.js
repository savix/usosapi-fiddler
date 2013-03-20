define(function() {
"use strict";


var Dialog = {
    showError: function(opts) {
        var dialog;
        
        opts = $.extend({
            title: "Error occured",
            width: 300,
            height: "auto",
            text: null,
            content: null
        }, opts);
        dialog = $("<div></div>");
        if (opts.text) {
            dialog.text(opts.text);
        } else {
            dialog.html(opts.content);
        }
        dialog.dialog({
            title: opts.title,
            width: opts.width,
            height: opts.height,
            modal: true,
            buttons: {
                OK: function() {
                    dialog.dialog("close");
                }
            },
            close: function() {
                dialog.remove();
            }
        });
    },
    
    showGenericClientError: function() {
        Dialog.showError({
            text: "An error occurred while connecting to the specified USOSapi installation."
        });
    }
};


return {
    Dialog: Dialog
};

});
