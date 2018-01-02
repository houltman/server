// Load required modules
//var http    = require("http");              // http server core module
var express = require("express");           // web framework external module
var serveStatic = require('serve-static');  // serve static files
var socketIo = require("socket.io");        // web socket external module
var easyrtc = require("../");
var fs = require('fs'); 
              // EasyRTC external module            
var https = require('https');
var pem = require('pem');
 
//pem.createCertificate({days: 100, selfSigned: true}, function(err, keys) {
  var options = {
   key: fs.readFileSync('/etc/letsencrypt/live/experto-e.com-0001/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/experto-e.com-0001/cert.pem')
  
  //  key: keys.serviceKey,
//    cert: keys.certificate
  };

// Set process name
process.title = "node-easyrtc";

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var app = express();
app.use(serveStatic('static', {'index': ['index.html']}));

// Start Express http server on port 8080
var webServer = https.createServer(options,app).listen(9088);

 //https.createServer(options, app).listen(8089);
// Start Socket.io so it attaches itself to Express server
var socketServer = socketIo.listen(webServer, {"log level":1});
easyrtc.setOption("logLevel", "debug");
easyrtc.on("getIceConfig", function(connectionObj, callback){
  var myIceServers=[
   {"urls": "stun:stun.l.google.com:19302"},
    
    {"urls":"turn:experto-e.com:3478?transport=udp",
    "credential":"experto-e",
    "username":"expertoe",
    },
    {"urls":"turn:experto-e.com:3478?transport=tcp",
    "credential":"experto-e",
    "username":"expertoe",
    },
     {"urls":"turns:experto-e.com:5349?transport=udp",
    "credential":"experto-e",
    "username":"expertoe",
    },
    {"urls":"turns:experto-e.com:5349?transport=tcp",
    "credential":"experto-e",
    "username":"expertoe",
    }
    
  ];

  callback(null, myIceServers);
});
// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }
        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
    console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});


// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, null, function(err, rtcRef) {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});

//listen on port 8080
webServer.listen(9088, function () {
    console.log('listening on https://localhost:9088');
});

