"use strict";

var fs = require("fs");
var EJS = require("../lib/ejs").EJS;
var path = require("path");
var pp = require("preprocess");

function compileSource(source) {
    return '(function(_CONTEXT,_VIEW) { try { with(_VIEW) { with (_CONTEXT) {' +
           (new EJS({text: source}).template.out) +
           " return ___ViewO.join('');}}}catch(e){e.lineNumber=null;throw e;}})";
}

module.exports = function(grunt) {
    grunt.registerMultiTask("ejscompile", "Compile EJS templates.", function() {
        var options, out;
    
        options = this.options({
            dir: undefined,
            wrapper: undefined,
            out: undefined
        });
        out = [];
        grunt.file.recurse(options.dir, function(p, rootdir, subdir, filename) {
            if (grunt.file.isMatch("*.ejs", filename)) {
                out.push(JSON.stringify(path.basename(p, ".ejs")) + ": " + compileSource(grunt.file.read(p)));
                grunt.log.writeln("Processing " + p);
            }
        });
        out = "{" + out.join(",") + "}";
        out = pp.preprocess(grunt.file.read(options.wrapper), {templates: out}, "js");
        grunt.file.write(options.out, out);
    });
}
