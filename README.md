# USOSapi Fiddler

## Setting up development environment

First, you need to install Node.js and npm. On Ubuntu:

    sudo apt install npm
    
Then, install required npm packages: 

    npm install

For your convenience, you should also install Grunt CLI:

    sudo npm install -g grunt-cli

## Hacking

Use the following command to start a HTTP server that serves source code directly:

    grunt connect:dev

Then, open http://localhost:8080/fiddler.html in your browser.

## Deployment

Execute the following command to generate production code (minimized etc.):

    grunt
    
Generated files can be found in dist/ directory. You can check if generated code works fine by starting
a HTTP server with the below command:

    grunt connect:dist

## Licensing

The code of USOSapi Fiddler is released under MIT license. In production mode, the following libraries
are additionally used:

* ACE, BSD license\
https://ace.c9.io/
* almond, MIT license\
http://github.com/requirejs/almond
* EJS, Apache License, version 2.0\
http://ejs.co/
* jQuery, MIT license\
http://jquery.com/
* jQuery UI, MIT license\
http://jqueryui.com
* jQuery UI Layout Plug-in, GPL/MIT dual license\
http://layout.jquery-dev.com/
