var PORT = 8124;

var Http = require('http');
var Express = require('express');
var SocketIO = require('socket.io');
var EditorSocketIOServer = require('ot/lib/editor-socketio-server');

var app = Express();
app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/client.html');
});

var http = Http.Server(app);
http.listen(PORT);

var ot = new EditorSocketIOServer("", [], 0, false);

var io = SocketIO(http);
io.on('connection', (socket) => {
    ot.addClient(socket);
});
