/**
 * Setup and run our Express server
 *
 * This server is used during development and is not necessary for production
 * once all static files have been rendered out
 */

var express      = require('express');
var routes       = require('./routes');
var http         = require('http');
var path         = require('path');
var writer       = require('express-writer');
var cons         = require('consolidate');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var favicon      = require('static-favicon');
var errorhandler = require('errorhandler');
var fs           = require('fs');
var hbs          = require('handlebars');

var partials = "./views/partials/";
var app = express();
var server;

// all environments
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
// Assign the handlebars engine to .html files
app.engine('html', cons.handlebars);
app.set('view engine', 'html');

// Register partials
fs.readdirSync(partials).forEach(function (file) {
  var source = fs.readFileSync(partials + file, "utf8"),
      partial = /(.+)\.html/.exec(file).pop();
  hbs.registerPartial(partial, source);
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(express.static(path.join(__dirname, 'public')));

// Out static site's routes
app.get('/', routes.index);

//ERROR HANDLING
/// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});
// development only
if ('development' === app.get('env')) {
  app.use(errorhandler());
} else if ('production' === app.get('env')) {
  app.use(writer.watch);
}



server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
  console.log('Node environment is ' + app.get('env'));
});
