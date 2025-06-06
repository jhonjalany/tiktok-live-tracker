import { ProtoMessageFetchResult } from '../../types/tiktok-schema';
import { EventEmitter } from 'node:events';
import { TikTokLiveConnection } from '../../lib';
declare const WebcastPushConnection_base: new (...args: any[]) => EventEmitter & TikTokLiveConnection;
/**
 * The legacy WebcastPushConnection class for backwards compatibility.
 * @deprecated Use TikTokLiveConnection instead.
 */
export declare class WebcastPushConnection extends WebcastPushConnection_base {
    protected processProtoMessageFetchResult(fetchResult: ProtoMessageFetchResult): Promise<void>;
}
export {};
//# sourceMappingURL=legacy-client.d.ts.map