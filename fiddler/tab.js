define(function() {
"use strict";


function Tabs(tabbarNode, tabsNode, blankNode) {
    this.$active = null;
    this.$all = [];
    this.$tabbarNode = tabbarNode;
    this.$tabsNode = tabsNode;
    this.$blankNode = blankNode;
}

Tabs.createFromNode = function(node) {
    return new Tabs(
        node.find(".fiddler-tabbar").first(),
        node.find(".fiddler-tabs").first(),
        node.find(".fiddler-tab-blank").first());
};

Tabs.prototype = {

    $indexOf: function(tab) {
        var i;

        for (i = 0; i < this.$all.length; i++) {
            if (this.$all[i].tab === tab) {
                return i;
            }
        }
        return -1;

    },

    setActiveTab: function(tab) {
        if (tab !== this.$active.tab) {
            this.$active.tab.getNode().hide();
            this.$active.li.removeClass("fiddler-active");
            this.$active = this.$all[this.$indexOf(tab)];
            tab.getNode().show();
            tab.resize();
            this.$active.li.addClass("fiddler-active");
        }
    },

    getActiveTab: function() {
        if (this.$active === null) {
            return null;
        } else {
            return this.$active.tab;
        }
    },

    updateTabLabel: function(tab) {
        this.$all[this.$indexOf(tab)].label.text(tab.getLabel());
    },

    addTab: function(tab) {
        var label, entry, that = this, li;

        tab.setTabs(this);
        this.$tabsNode.append(tab.getNode());
        this.$tabbarNode.append(
            li = $("<li></li>").append(
                label = $("<a class='fiddler-label' href='#'></a>").click(function() {
                    that.setActiveTab(tab);
                })
            ).append(
                $("<a class='fiddler-close ui-icon ui-icon-close' href='#'>x</a>").click(function() {
                    that.removeTab(tab);
                })
            )
        );
        entry = {tab: tab, label: label, li: li};
        if (this.$active === null) {
            this.$active = entry;
            this.$blankNode.hide();
            li.addClass("fiddler-active");
        } else {
            $(tab.getNode()).hide();
        }
        label.text(tab.getLabel());
        this.$all.push(entry);
        return tab;
    },

    removeTab: function(tab) {
        // Currently removed tabs cannot be added again.
        var pos;

        tab.getNode().remove();
        pos = this.$indexOf(tab);
        this.$all[pos].li.remove();
        this.$all.splice(pos, 1);
        if (tab === this.$active.tab) {
            if (this.$all.length === 0) {
                this.$active = null;
                this.$blankNode.show();
            } else {
                pos = Math.min(this.$all.length - 1, pos);
                this.$active = this.$all[pos];
                this.$active.tab.getNode().show();
                this.$active.tab.resize();
                this.$active.li.addClass("fiddler-active");
            }
        }
    },

    resize: function() {
        if (this.$active !== null) {
            this.$active.tab.resize();
        }
    }
};


return {
    Tabs: Tabs
};

});
