define(["require", "./client", "./template", "./input-widget", "./dialog", "./util/pretty"], function(require) {
"use strict";

var SignMode = require("./client").SignMode;
var renderTemplate = require("./template").renderTemplate;
var InputWidget = require("./input-widget").InputWidget;
var ChoiceInput = require("./input-widget").ChoiceInput;
var Dialog = require("./dialog").Dialog;
var prettifyJSON = require("./util/pretty").prettifyJSON;
var prettifyXML = require("./util/pretty").prettifyXML;


function MethodTab(client) {
    var that = this;
    
    this.$tabs = null;
    this.$node = $(renderTemplate("method-tab"));
    this.$titleNode = this.$node.find(".fiddler-method-name");
    this.$descNode = this.$node.find(".fiddler-method-desc");
    this.$paramsNode = this.$node.find(".fiddler-method-params");
    this.$signModeForm = this.$node.find(".fiddler-sign-mode-form");
    this.$node.find(".fiddler-execute-button").click(function() {
        var paramValues = that.getParamValues(),
            signMode = that.getSignMode();
        
        if (signMode !== SignMode.ANONYMOUS && !that.getClient().hasConsumer()) {
            Dialog.showError({
                text: "You must specify consumer first!"
            });
            return;
        }
        
        if (signMode === SignMode.TOKEN && !that.getClient().hasToken()) {
            Dialog.showError({
                text: "You must specify token first!"
            });
            return;
        }
        
        if (that.$pendingResponse) {
            that.$pendingResponse.abort();
        }
        
        that.$throbberContainer.show();
        that.$pendingResponse = that.getClient().callMethod({
            path: that.$methodInfo.name,
            params: paramValues,
            signMode: signMode,
            complete: function(response) {
                var text;
                
                if (response.getStatus() === 500) {
                    text = response.getText();
                    if ((/^\s*</).test(text)) {
                        that.setResponseFrameValue(text);
                    } else {
                        that.setResponseEditorValue(text, "text");
                    }
                
                } else if (response.getStatus() !== 200) {
                    that.setResponseEditorValue(response.getText(), "text");
                } else {
                    var format = {xmlmap: "xml", xmlitems: "xml", json: "json"}[paramValues.format] || "text";
                    that.setResponseEditorValue(that.prettifyValue(response.getText(), format), format);
                }
                that.$pendingResponse = null;
                that.$throbberContainer.hide();
                that.$layout.open("south");
            }
        });
    });
    this.$node.find(".fiddler-pin-button").click(function() {
        that.$pinned = ! that.$pinned;
        this.value = that.$pinned ? 'Unpin' : 'Pin';
    });
    this.$throbberContainer = this.$node.find(".fiddler-throbber");
    this.$responseEditorNode = this.$node.find(".fiddler-response-editor");
    this.$responseFrameNode = that.$node.find(".fiddler-response-frame");
    this.$layout = this.$node.layout({
        maskIframesOnResize: true,
        fxName: "none",
        north: {
            resizable: false,
            closable: false,
            spacing_open: 0
        },
        south: {
            contentSelector: ".fiddler-content",
            onresize_end: function() {
                that.$responseEditor.resize();
            },
            size: 300,
            initClosed: true
        }
    });
    this.$signModeForm.tooltip().buttonset();
    this.$client = client;
    this.$paramWidgets = [];
    this.$pendingResponse = null;
    
    this.$responseEditor = ace.edit(this.$responseEditorNode[0]);
    this.$responseEditor.getSession().setMode("ace/mode/text");
    this.$responseEditor.getSession().setUseWrapMode(true);
    this.$responseEditor.getSession().setWrapLimitRange(null, null);
    this.$responseEditor.setReadOnly(true);
    this.$responseEditor.renderer.setShowPrintMargin(false);
    this.$responseRenderer = "editor";
    
    this.$methodInfo = null;
    this.$lastSignMode1 = SignMode.ANONYMOUS;
    this.$lastSignMode2 = SignMode.ANONYMOUS;
    this.$pinned = false;
}

MethodTab.prototype = {

    setTabs: function(tabs) {
        this.$tabs = tabs;
    },

    getNode: function() {
        return this.$node;
    },
    
    isPinned: function() {
        return this.$pinned;
    },
    
    resize: function() {
        this.$node.layout().resizeAll();
        if (this.$responseRenderer === "editor") {
            this.$responseEditor.resize();
        }
    },
    
    getClient: function() {
        return this.$client;
    },
    
    setClient: function(client) {
        this.$client = client;
    },
    
    getSignMode: function() {
        return this.$signModeForm.find("input:checked").val();
    },
    
    $setSignModeBounds: function(minSignMode, maxSignMode) {
        var selectedSignMode = this.$signModeForm.find("input:checked").val();
        if (selectedSignMode !== this.$lastSignMode2) {
            this.$lastSignMode1 = selectedSignMode;
        } else {
            selectedSignMode = this.$lastSignMode1;
        }
        if (SignMode.compare(selectedSignMode, minSignMode) < 0) {
            selectedSignMode = minSignMode;
        } else if (SignMode.compare(selectedSignMode, maxSignMode) > 0) {
            selectedSignMode = maxSignMode;
        }
        this.$lastSignMode2 = selectedSignMode;
        
        this.$signModeForm.find("input[value=" + selectedSignMode + "]").prop("checked", true);
        SignMode.ALL.forEach(function(signMode) {
            this.$signModeForm.find("input[value=" + signMode + "]").prop("disabled",
                SignMode.compare(signMode, minSignMode) < 0 || SignMode.compare(signMode, maxSignMode) > 0);
        }, this);        
        this.$signModeForm.buttonset("refresh");
    },

    getParamValues: function() {
        var result = {};
        $.each(this.$paramWidgets, function(i, widget) {
            var value = widget.getValue();
            if (value !== null) {
                result[widget.getName()] = value;
            }
        });
        return result;
    },
    
    $setResponseRenderer: function(renderer) {
        if (this.$responseRenderer === renderer) {
            return;
        }
        
        switch (this.$responseRenderer) {
        case "editor":
            this.$responseEditorNode.hide();
            break;
        case "frame":
            this.$responseFrameNode.hide();
            break;
        }
        
        switch (renderer) {
        case "editor":
            this.$responseEditorNode.show();
            this.$responseEditor.resize();
            break;
        case "frame":
            this.$responseFrameNode.show();
            break;
        }
        this.$responseRenderer = renderer;
    },
    
    setResponseEditorValue: function(value, format) {
        this.$setResponseRenderer("editor");
        this.$responseEditor.setValue(value);
        this.$responseEditor.clearSelection();
        this.$responseEditor.moveCursorTo(0, 0);
        this.$responseEditor.getSession().setMode({
            json: "ace/mode/json",
            text: "ace/mode/text",
            xml: "ace/mode/xml"
        }[format]);
    },
    
    setResponseFrameValue: function(value) {
        var frameDocument = this.$responseFrameNode.get(0).contentWindow.document;
        this.$setResponseRenderer("frame");
        frameDocument.open();
        frameDocument.write(value);
        frameDocument.close();
    },
    
    prettifyValue: function(value, format) {
        if (format === "json") {
            return prettifyJSON(value);
        } else if (format === "xml") {
            return prettifyXML(value);
        } else {
            return value;
        }
    },
    
    getLabel: function() {
        if (this.$methodInfo === null) {
            return "";
        } else {
            return this.$methodInfo.name.slice(9);
        }
    },
    
    setMethodInfo: function(methodInfo) {
        var paramsNode = this.$paramsNode,
            paramWidgets = [],
            hasFormat = false,
            formatWidget;
        
        this.$titleNode.text(methodInfo.name);
        this.$descNode.text(methodInfo.brief_description + " ").append(
            $("<a target='_blank'>more</a>").prop("href", methodInfo.ref_url)
        );
        paramsNode.empty();
        
        $.each(methodInfo["arguments"], function(i, paramInfo) {
            var widget;
            
            if (paramInfo.name === "format") {
                hasFormat = true;
                return;
            }
            if (paramInfo.name === "callback") {
                return;
            }
            
            widget = InputWidget.createFromParamInfo(paramInfo, methodInfo.name);
            paramsNode.append(
                $("<dt/>").text(paramInfo.name).css(
                    paramInfo.is_required ? {fontWeight: "bold"} : {}
                ).tooltip(
                    {items: "dt", content: paramInfo.description, show: false, hide: false}
                )
            ).append(
                $("<dd/>").append(widget.getNode())
            );
            paramWidgets.push(widget);
        });
        if (hasFormat) {
            formatWidget = new ChoiceInput("format", ["json", "xmlmap", "xmlitems"], "json");
            paramsNode.append($("<dt>format</dt>"));
            paramsNode.append($("<dd/>").append(formatWidget.getNode()));
            paramWidgets.push(formatWidget);
        }
        this.setResponseEditorValue("", "text");
        this.$paramWidgets = paramWidgets;
        this.$methodInfo = methodInfo;
        
        if (methodInfo.auth_options.consumer === "ignored") {
            this.$setSignModeBounds(SignMode.ANONYMOUS, SignMode.ANONYMOUS);
        } else if (methodInfo.auth_options.consumer === "optional") {
            if (methodInfo.auth_options.token === "ignored") {
                this.$setSignModeBounds(SignMode.ANONYMOUS, SignMode.CONSUMER);
            } else {
                this.$setSignModeBounds(SignMode.ANONYMOUS, SignMode.TOKEN);
            }
        } else {
            if (methodInfo.auth_options.token === "ignored") {
                this.$setSignModeBounds(SignMode.CONSUMER, SignMode.CONSUMER);
            } else if (methodInfo.auth_options.token === "optional") {
                this.$setSignModeBounds(SignMode.CONSUMER, SignMode.TOKEN);
            } else {
                this.$setSignModeBounds(SignMode.TOKEN, SignMode.TOKEN);
            }
        }
        this.$tabs.updateTabLabel(this);
        this.resize();
    },
    
    activate: function() {
        this.$tabs.setActiveTab(this);
    }
};


return {
    SignMode: SignMode,
    MethodTab: MethodTab
};

});
