/**
 * Setup and run our Express server
 *
 * This server is used during development and is not necessary for production
 * once all static files have been rendered out
 */

var PARTITIONS = 4;
var SUB_PARTITIONS = 100;

var express      = require('express');
var app          = express();
var routes       = require('./routes');
var server       = require('http').Server(app);
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
var io           = require('socket.io')(server);
var chroma       = require('chroma-js');
var _            = require('lodash');

var partials = "./views/partials/";
var colorDict = {};
var socketList = {};
var scale = chroma.scale(['#BA7396', '#F1F86F']).out('hex').domain([0,SUB_PARTITIONS]);


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

app.get('/validate/:id',function(req,res){
  if (isUnique(req.params.id)){
    res.json(200,{status:'ok'});
  } else {
    res.json(200,{status:'ng'});
  }
});

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


io.on('connection', function(socket){
  console.log('Captain, a user is connected!');
  socket.emit('who are you',function(response){
    console.log(response);
  });

  socket.on('disconnect', function(){
    if(socket.id in socketList){
      colorDict[socketList[socket.id]].status='inactive';
      console.log('==========DISCONNECTED==============');
      //console.log(JSON.stringify(colorDict));
      console.log(socketList[socket.id]);
      socket.broadcast.emit('user left', colorDict);
      delete socketList[socket.id];
    }
  });

  socket.on('message',function(data){
    console.log(socket.id);
    console.log(JSON.stringify(socketList));
    if(socket.id in socketList  && colorDict[socketList[socket.id]].status === 'active'){
      socket.broadcast.emit('message',data);
    } else {
      socket.emit('destroy');
    }
  });

  socket.on('terminate user',function(id){
    var rm = findSocketName(id);
    var sock = io.sockets.connected[rm];
    sock.emit('destroy');
  });
  
  socket.on('i am',function(initial){
    codeColor(initial);
    io.emit('update colors',colorDict);
    socketList[socket.id]=initial;
  });
});

function codeColor(initial){
  if(!(initial in colorDict)){
    var index = _.size(colorDict);
    var partition_index = (SUB_PARTITIONS/PARTITIONS)*(index % PARTITIONS);
    var subPartition_index = Math.floor(index/PARTITIONS);
    var scaleIndex = partition_index+subPartition_index;
    var L = 50;
    var R = 120-(Math.floor((index+4)/8)*20);
    var A = R*Math.cos((index+2)*Math.PI/4);
    var B = R*Math.sin((index+2)*Math.PI/4);
    colorDict[initial]= {color:chroma.lab(L,A,B).alpha(0.5).css(),status:'active'};
  } else if (colorDict[initial].status==='inactive'){
    colorDict[initial].status = 'active';
  }
  console.log(JSON.stringify(colorDict));
}

function isUnique(initial){
  if(!(initial in colorDict)) {
    return true;
  } else if(colorDict[initial].status==='inactive'){
    return true;
  }
  return false;
}

function findSocketName(id){
  for(var prop in socketList){
    if (socketList[prop]===id) return prop;
  }
  return undefined;
}

/*io.sockets.on('message',function(socket,data){
  console.log('message data='+data);
  socket.broadcast.emit('message',data);
});*/

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
  console.log('Node environment is ' + app.get('env'));
});
