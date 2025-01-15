import { connection, server as WebSocketServer } from 'websocket'
import http from 'http';
import { SupportedMessage as OutgoingSupportMessage } from './messages/outgoingMessages'
import { IncomingMessage, SupportedMessage } from './messages/incomingMessages';
import { UserManager } from './UserManager';
import { InMemoryStore } from './store/inMemoryStore';

const server = http.createServer(function (request: any, response: any) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

const userManager = new UserManager()
const store = new InMemoryStore()

server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');
});

const wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin: string) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function (message) {
        //Add rate limmting logic here
        if (message.type === 'utf8') {
            try {
                messageHandler(connection, JSON.parse(message.utf8Data))
            } catch (e) {

            }
            // console.log('Received Message: ' + message.utf8Data);
            // connection.sendUTF(message.utf8Data);
        }

    });
    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

function messageHandler(ws: connection, message: IncomingMessage) {
    console.log('incoming message ', JSON.stringify(message))
    if (message.type == SupportedMessage.JoinRoom) {
        const payload = message.payload
        userManager.addUser(payload.name, payload.userId, payload.roomId, ws)
    }
    if (message.type === SupportedMessage.SendMessage) {
        const payload = message.payload
        const user = userManager.getUser(payload.roomId, payload.userId)
        if (!user) {
            console.log('user not found in db')
            return
        }
        const chat = store.addChat(payload.userId, user.name, payload.message, payload.roomId)
        if(!chat) return
        const outgoingPayload = {
            type: OutgoingSupportMessage.AddChat,
            payload: {
                chatId: chat.id,
                roomId: payload.roomId,
                message: payload.message,
                name: user.name,
                upvotes: 0
            }
        }

        userManager.broadcase(payload.roomId, payload.userId, outgoingPayload)
    }
    if (message.type === SupportedMessage.UpvoteMessage) {
        const payload = message.payload
        const chat = store.upvote(payload.userId, payload.roomId, payload.chatId)
        if(!chat) return
        const outgoingPayload = {
            type: OutgoingSupportMessage.UpdateChat,
            payload:{
                roomId: payload.roomId,
                chatId: payload.chatId,
                upvotes: chat.upvotes.length
            }
        }
    }
}