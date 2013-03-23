module.exports = function(grunt) {
    "use strict";

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        
        preprocess: {
            html: {
                src: "fiddler.html",
                dest: "dist/fiddler.html"
            }
        },
        
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                latedef: true,
                unused: true,
                strict: true,
                //trailing: true
                maxlen: 120
            },
            all: ["Gruntfile.js", "fiddler.js", "fiddler/**/*.js"]
        },
        
        less: {
            all: {
                options: {
                    yuicompress: true
                },
                files: {
                    "dist/css/fiddler.css": "css/fiddler.less"
                }
            }
        },
        
        requirejs: {
            all: {
                options: {
                    baseUrl: ".",
                    paths: {
                        "fiddler/-template": "build/fiddler/-template"
                    },
                    name: "lib/almond",
                    include: "fiddler",
                    out: "dist/js/fiddler.js"
                }
            }
        },
        
        copy: {
            img: {
                files: [
                    {src: ["img/**"], dest: "dist/"}
                ]
            },
            js: {
                files: [
                    {cwd: "lib/", expand: true, src: ["jquery*.js", "ace/**"], dest: "dist/js/"}
                ]
            },
            html: {
                files: [
                    {src: ["authorized.html"], dest: "dist/"}
                ]
            },
            css: {
                files: [
                    {src: ["css/smoothness/**", "css/fonts/**", "css/layout-default-latest.css"], dest: "dist/"}
                ]
            }
        },
        
        ejscompile: {
            all: {
                options: {
                    dir: "fiddler/template/",
                    wrapper: "fiddler/-template.js.tpl",
                    out: "build/fiddler/-template.js"
                }
            }
        },
        
        connect: {
            dev: {
                options: {
                    port: 8080,
                    base: "./",
                    keepalive: true
                }
            },
            dist: {
                options: {
                    port: 8080,
                    base: "./dist",
                    keepalive: true
                }
            }
        },
        
        clean: ["build/", "dist/"]
    });

    grunt.loadNpmTasks("grunt-preprocess");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-requirejs");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadTasks("tasks/");
    
    
    grunt.registerTask("default", [
        "ejscompile:all", "requirejs:all", "copy:js",
        "less:all", "copy:css",
        "copy:img",
        "copy:html", "preprocess:html"
    ]);
};
