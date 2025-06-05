/// <reference types="node" />
/// <reference types="node" />
import { client as WebSocket, connection as WebSocketConnection, Message as WebSocketMessage } from 'websocket';
import * as http from 'node:http';
import { WebSocketParams } from '../../../types/client';
import TypedEventEmitter from 'typed-emitter';
import CookieJar from '../../../lib/web/lib/cookie-jar';
declare type EventMap = {
    connect: (connection: WebSocketConnection) => void;
    close: () => void;
    messageDecodingFailed: (error: Error) => void;
    unknownResponse: (message: WebSocketMessage) => void;
    protoMessageFetchResult: (response: any) => void;
    webSocketData: (data: Uint8Array) => void;
};
declare type TypedWebSocket = WebSocket & TypedEventEmitter<EventMap>;
declare type WebSocketConstructor = new () => TypedWebSocket;
declare const TikTokWsClient_base: WebSocketConstructor;
export default class TikTokWsClient extends TikTokWsClient_base {
    protected readonly webSocketParams: WebSocketParams;
    protected webSocketPingIntervalMs: number;
    connection: WebSocketConnection | null;
    protected pingInterval: NodeJS.Timeout | null;
    protected wsHeaders: Record<string, string>;
    protected wsUrlWithParams: string;
    constructor(wsUrl: string, cookieJar: CookieJar, webSocketParams: WebSocketParams, webSocketHeaders: Record<string, string>, webSocketOptions: http.RequestOptions, webSocketPingIntervalMs?: number);
    protected onConnect(wsConnection: WebSocketConnection): void;
    /**
     * Send a message to the WebSocket server
     * @param data The message to send
     * @returns True if the message was sent, false otherwise
     */
    sendBytes(data: Uint8Array): boolean;
    protected onDisconnect(): void;
    /**
     * Handle incoming messages
     * @param message The incoming WebSocket message
     * @protected
     */
    protected onMessage(message: WebSocketMessage): Promise<boolean>;
    /**
     * Static Keep-Alive ping
     */
    protected sendHeartbeat(): void;
    /**
     * Message Acknowledgement
     * @param id The message id to acknowledge
     */
    protected sendAck(id: string): void;
    /**
     * Close the WebSocket connection
     */
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=ws-client.d.ts.map