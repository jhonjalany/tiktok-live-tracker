import TypedEventEmitter from 'typed-emitter';
import TikTokWsClient from '../lib/ws/lib/ws-client';
import { DecodedData, RoomGiftInfo, RoomInfo, TikTokLiveConnectionOptions, WebSocketParams } from '../types/client';
import { RoomInfoResponse, TikTokWebClient } from '../lib/web';
import { EulerSigner } from '../lib/web/lib/tiktok-signer';
import { ClientEventMap, ConnectState, TikTokLiveConnectionState } from '../types/events';
import { IWebcastRoomChatPayload, IWebcastRoomChatRouteResponse } from '@eulerstream/euler-api-sdk';
import { ProtoMessageFetchResult } from '../types';
declare const TikTokLiveConnection_base: new () => TypedEventEmitter<ClientEventMap>;
export declare class TikTokLiveConnection extends TikTokLiveConnection_base {
    readonly uniqueId: string;
    readonly signer?: EulerSigner;
    webClient: TikTokWebClient;
    wsClient: TikTokWsClient | null;
    protected _roomInfo: RoomInfo | null;
    protected _availableGifts: Record<any, any> | null;
    protected _connectState: ConnectState;
    readonly options: TikTokLiveConnectionOptions;
    /**
     * Create a new TikTokLiveConnection instance
     * @param {string} uniqueId TikTok username (from URL)
     * @param {object} [options] Connection options
     * @param {boolean} [options[].authenticateWs=false] Authenticate the WebSocket connection using the session ID from the "sessionid" cookie
     * @param {boolean} [options[].processInitialData=true] Process the initital data which includes messages of the last minutes
     * @param {boolean} [options[].fetchRoomInfoOnConnect=false] Fetch the room info (room status, streamer info, etc.) on connect (will be returned when calling connect())
     * @param {boolean} [options[].enableExtendedGiftInfo=false] Enable this option to get extended information on 'gift' events like gift name and cost
     * @param {boolean} [options[].enableRequestPolling=true] Use request polling if no WebSocket upgrade is offered. If `false` an exception will be thrown if TikTok does not offer a WebSocket upgrade.
     * @param {number} [options[].requestPollingIntervalMs=1000] Request polling interval if WebSocket is not used
     * @param {string} [options[].sessionId=null] The session ID from the "sessionid" cookie is required if you want to send automated messages in the chat.
     * @param {object} [options[].webClientParams={}] Custom client params for Webcast API
     * @param {object} [options[].webClientHeaders={}] Custom request headers for axios
     * @param {object} [options[].websocketHeaders={}] Custom request headers for websocket.client
     * @param {object} [options[].webClientOptions={}] Custom request options for axios. Here you can specify an `httpsAgent` to use a proxy and a `timeout` value for example.
     * @param {object} [options[].websocketOptions={}] Custom request options for websocket.client. Here you can specify an `agent` to use a proxy and a `timeout` value for example.
     * @param {string[]} [options[].preferredAgentIds=[]] Preferred agent IDs to use for the WebSocket connection. If not specified, the default agent IDs will be used.
     * @param {boolean} [options[].connectWithUniqueId=false] Connect to the live stream using the unique ID instead of the room ID. If `true`, the room ID will be fetched from the TikTok API.
     * @param {boolean} [options[].logFetchFallbackErrors=false] Log errors when falling back to the API or Euler source
     * @param {function} [options[].signedWebSocketProvider] Custom function to fetch the signed WebSocket URL. If not specified, the default function will be used.
     * @param {EulerSigner} [signer] TikTok Signer instance. If not provided, a new instance will be created using the provided options
     */
    constructor(uniqueId: string, options?: Partial<TikTokLiveConnectionOptions>, signer?: EulerSigner);
    /**
     * Set the connection state to disconnected
     * @protected
     */
    protected setDisconnected(): void;
    /**
     * Get the current Room Info
     */
    get roomInfo(): RoomInfoResponse;
    /**
     * Get the available gifts
     */
    get availableGifts(): Record<any, any>;
    /**
     * Get the current connection state
     */
    get isConnecting(): boolean;
    /**
     * Check if the connection is established
     */
    get isConnected(): boolean;
    /**
     * Get the current client parameters
     */
    get clientParams(): Record<string, string>;
    /**
     * Get the current room ID
     */
    get roomId(): string;
    /**
     * Get the current connection state including the cached room info and all available gifts
     * (if `enableExtendedGiftInfo` option enabled)
     */
    get state(): TikTokLiveConnectionState;
    /**
     * Connects to the live stream of the specified streamer
     * @param roomId Room ID to connect to. If not specified, the room ID will be retrieved from the TikTok API
     * @returns The current connection state
     */
    connect(roomId?: string): Promise<TikTokLiveConnectionState>;
    /**
     * Connects to the live stream of the specified streamer
     *
     * @param roomId Room ID to connect to. If not specified, the room ID will be retrieved from the TikTok API
     * @protected
     */
    protected _connect(roomId?: string): Promise<void>;
    /**
     * Disconnects the connection to the live stream
     */
    disconnect(): Promise<void>;
    /**
     * Fetch the room ID from the TikTok API
     * @param uniqueId Optional unique ID to use instead of the current one
     */
    fetchRoomId(uniqueId?: string): Promise<string>;
    fetchIsLive(): Promise<boolean>;
    /**
     * Wait until the streamer is live
     * @param seconds Number of seconds to wait before checking if the streamer is live again
     */
    waitUntilLive(seconds?: number): Promise<void>;
    /**
     * Get the current room info (including streamer info, room status and statistics)
     * @returns Promise that will be resolved when the room info has been retrieved from the API
     */
    fetchRoomInfo(): Promise<RoomInfoResponse>;
    /**
     * Get the available gifts in the current room
     * @returns Promise that will be resolved when the available gifts have been retrieved from the API
     */
    fetchAvailableGifts(): Promise<RoomGiftInfo>;
    /**
     * Send a message to a TikTok LIVE Room
     *
     * @param content Message content to send to the stream
     * @param options Optional parameters for the message (incl. parameter overrides)
     */
    sendMessage(content: string, options?: Partial<Omit<IWebcastRoomChatPayload, 'content'>>): Promise<IWebcastRoomChatRouteResponse>;
    /**
     * Set up the WebSocket connection
     *
     * @param wsUrl WebSocket URL
     * @param wsParams WebSocket parameters
     * @returns Promise that will be resolved when the WebSocket connection is established
     * @protected
     */
    protected setupWebsocket(wsUrl: string, wsParams: WebSocketParams): Promise<TikTokWsClient>;
    protected processProtoMessageFetchResult(protoMessageFetchResult: ProtoMessageFetchResult): Promise<void>;
    protected processDecodedData({ data, type }: DecodedData): Promise<boolean | void>;
    /**
     * Handle the error event
     *
     * @param exception Exception object
     * @param info Additional information about the error
     * @protected
     */
    protected handleError(exception: Error, info: string): void;
}
export {};
//# sourceMappingURL=client.d.ts.map