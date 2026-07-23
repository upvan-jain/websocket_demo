const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// 1. Create a standard HTTP Server to serve the index.html client page
const httpServer = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Start the HTTP Server on Port 3000
httpServer.listen(3000, () => {
    console.log('HTTP Client Page server running at http://localhost:3000/');
});

// 2. Create the WebSocket Server on Port 8080
const wss = new WebSocketServer({ port: 8080 }, () => {
    console.log('WebSocket Server running at ws://localhost:8080/');
});

// In-memory set to keep track of all active client sockets
const clients = new Set();

wss.on('connection', (ws, req) => {
    // A new client has completed the HTTP Handshake and upgraded to WebSocket!
    clients.add(ws);
    const clientIP = req.socket.remoteAddress;
    console.log(`[Server] New connection established from ${clientIP}. Active Clients: ${clients.size}`);

    // Welcome message to the newly connected socket
    ws.send(JSON.stringify({
        sender: 'System',
        message: 'Welcome to the real-time WebSocket chat room!',
        timestamp: new Date().toLocaleTimeString()
    }));

    // Listen for incoming message frames from this client
    ws.on('message', (rawData) => {
        try {
            // Raw data arrives as a buffer, parse it as UTF-8 string
            const data = JSON.parse(rawData.toString());
            console.log(`[Server] Received message from ${data.username}: "${data.message}"`);

            // Construct broadcast payload
            const broadcastPayload = JSON.stringify({
                sender: data.username,
                message: data.message,
                timestamp: new Date().toLocaleTimeString()
            });

            // Broadcast the message frame to all other active sockets except the sender
            for (const client of clients) {
                if (client !== ws && client.readyState === 1) { // Exclude sender
                    client.send(broadcastPayload);
                }
            }
        } catch (err) {
            console.error('[Server] Failed to parse client frame data:', err);
        }
    });

    // Handle connection drops or client closing the socket
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`[Server] Connection closed. Active Clients: ${clients.size}`);
    });

    // Handle socket errors
    ws.on('error', (err) => {
        console.error(`[Server] Socket error occurred:`, err);
        clients.delete(ws);
    });
});
