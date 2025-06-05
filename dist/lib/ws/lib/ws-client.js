"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_1 = require("websocket");
const utilities_1 = require("../../../lib/utilities");
const config_1 = __importDefault(require("../../../lib/config"));
const types_1 = require("../../../types");
class TikTokWsClient extends websocket_1.client {
    webSocketParams;
    webSocketPingIntervalMs;
    connection;
    pingInterval;
    wsHeaders;
    wsUrlWithParams;
    constructor(wsUrl, cookieJar, webSocketParams, webSocketHeaders, webSocketOptions, webSocketPingIntervalMs = 10000) {
        super();
        this.webSocketParams = webSocketParams;
        this.webSocketPingIntervalMs = webSocketPingIntervalMs;
        this.pingInterval = null;
        this.connection = null;
        this.wsUrlWithParams = `${wsUrl}?${new URLSearchParams(this.webSocketParams)}${config_1.default.DEFAULT_WS_CLIENT_PARAMS_APPEND_PARAMETER}`;
        this.wsHeaders = { Cookie: cookieJar.getCookieString(), ...(webSocketHeaders || {}) };
        this.on('connect', this.onConnect.bind(this));
        this.connect(this.wsUrlWithParams, '', `https://${config_1.default.TIKTOK_HOST_WEB}`, this.wsHeaders, webSocketOptions);
    }
    onConnect(wsConnection) {
        this.sendHeartbeat();
        this.connection = wsConnection;
        this.pingInterval = setInterval(() => this.sendHeartbeat(), this.webSocketPingIntervalMs);
        this.connection.on('message', this.onMessage.bind(this));
        this.connection.on('close', this.onDisconnect.bind(this));
    }
    /**
     * Send a message to the WebSocket server
     * @param data The message to send
     * @returns True if the message was sent, false otherwise
     */
    sendBytes(data) {
        if (this.connection) {
            this.connection.sendBytes(Buffer.from(data));
            return true;
        }
        return false;
    }
    onDisconnect() {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
        this.connection = null;
        this.emit('close');
    }
    /**
     * Handle incoming messages
     * @param message The incoming WebSocket message
     * @protected
     */
    async onMessage(message) {
        // Emit WebSocket data
        this.emit('webSocketData', message);
        // If the message is not binary, emit an unknown response
        if (message.type !== 'binary') {
            return this.emit('unknownResponse', message);
        }
        //  If the message is binary, decode it
        try {
            const decodedContainer = await (0, utilities_1.deserializeWebSocketMessage)(message.binaryData);
            // Always send an ACK for the message
            if (decodedContainer.id != null) {
                this.sendAck(decodedContainer.id);
            }
            // If the message is a protoMessageFetchResult, emit it
            if (decodedContainer.protoMessageFetchResult) {
                this.emit('protoMessageFetchResult', decodedContainer.protoMessageFetchResult);
            }
        }
        catch (err) {
            this.emit('messageDecodingFailed', err);
        }
    }
    /**
     * Static Keep-Alive ping
     */
    sendHeartbeat() {
        this.sendBytes(Buffer.from('3A026862', 'hex'));
    }
    /**
     * Message Acknowledgement
     * @param id The message id to acknowledge
     */
    sendAck(id) {
        const ackMessage = types_1.WebSocketAckMessage.encode({ type: 'ack', id });
        this.connection.sendBytes(Buffer.from(ackMessage.finish()));
    }
    /**
     * Close the WebSocket connection
     */
    close() {
        return new Promise((resolve) => {
            this.once('close', () => resolve());
            // If connected, disconnect
            if (this.connection) {
                this.connection.close(1000);
            }
            // Otherwise immediately resolve
            else {
                resolve();
            }
        });
    }
}
exports.default = TikTokWsClient;
//# sourceMappingURL=ws-client.js.map