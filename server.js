var Http = require('http');
var Express = require('express');
var SocketIO = require('socket.io');
var EditorSocketIOServer = require('ot/lib/editor-socketio-server');
var fs = require('fs');
var path = require('path');

/**
 * ot.js patch for socket.io >= 1.0
 * Copyright © 2012-2014 Tim Baumann, http://timbaumann.info
 * Released under the MIT License, https://github.com/Operational-Transformation/ot.js/blob/master/LICENSE
 */
{
    var EventEmitter = require('events').EventEmitter;
    var TextOperation = require('ot/lib/text-operation');
    var WrappedOperation = require('ot/lib/wrapped-operation');
    var Server = require('ot/lib/server');
    var Selection = require('ot/lib/selection');
    var util = require('util');
    EditorSocketIOServer.prototype.addClient = function (socket) {
        var self = this;
        socket
            .join(this.docId)
            .emit('doc', {
                str: this.document,
                revision: this.operations.length,
                clients: this.users
            })
            .on('operation', function (revision, operation, selection) {
                self.mayWrite(socket, function (mayWrite) {
                    if (!mayWrite) {
                        console.log("User doesn't have the right to edit.");
                        return;
                    }
                    self.onOperation(socket, revision, operation, selection);
                });
            })
            .on('selection', function (obj) {
                self.mayWrite(socket, function (mayWrite) {
                    if (!mayWrite) {
                        console.log("User doesn't have the right to edit.");
                        return;
                    }
                    self.updateSelection(socket, obj && Selection.fromJSON(obj));
                });
            })
            .on('disconnect', function () {
                console.log("Disconnect");
                socket.leave(self.docId);
                self.onDisconnect(socket);
                if (
                    (socket.manager && socket.manager.sockets.clients(self.docId).length === 0) || // socket.io <= 0.9
                    (socket.ns && Object.keys(socket.ns.connected).length === 0) // socket.io >= 1.0
                ) {
                    self.emit('empty-room');
                }
            });
    };
}

if (process.argv.length != 4) {
    console.error('Usage: node server.js filepath port');
    console.error('To stop server safe, please type "exit". ');
    process.exit();
}

var filepath = process.argv[2];
var port = Number(process.argv[3]);

var app = Express();
app.use('/', Express.static(__dirname + '/client'));

var http = Http.Server(app);
http.listen(port);

var read = "";
try {
    read = String(fs.readFileSync(filepath));
} catch (e) {
}
var ot = new EditorSocketIOServer(read, [], 0, false);

var io = SocketIO(http);
io.on('connection', (socket) => {
    io.emit('name', path.basename(filepath));
    ot.addClient(socket);
});

process.stdin.on('data', (data) => {
    if (data == 'exit\r\n' || data == 'exit\n') {
        process.exit();
    }
});

setInterval(() => {
    fs.writeFileSync(filepath, ot.document);
}, 1000 * 60);

process.on('exit', () => {
    fs.writeFileSync(filepath, ot.document);
});
