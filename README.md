Real-time imageboard.
MIT licensed.

Setup:

* Install deps and npm deps
* Copy config.js.example to config.js and configure
* Copy hot.js.example to hot.js and configure
* Run `make` to build some essential components
* Run `node builder.js` to run an auto-reloading development server
* Run `node server/server.js` for just the server
* Be sure to `make client` for any client-affecting change

Dependencies:

* ImageMagick
* node.js
* redis

npm modules:

* async
* formidable
* imagemagick
* oauth
* redis
* sockjs
* winston

Optional npm deps for various features:

* daemon
* icecast banners: node-expat, request
