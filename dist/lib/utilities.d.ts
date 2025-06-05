/// <reference types="node" />
/// <reference types="node" />
import { DecodedWebcastPushFrame, IWebcastDeserializeConfig, WebcastMessage } from '../types/client';
import { DevicePreset } from '../lib/config';
export declare const WebcastDeserializeConfig: IWebcastDeserializeConfig;
export declare function deserializeMessage<T extends keyof WebcastMessage>(protoName: T, binaryMessage: Buffer): WebcastMessage[T];
export declare function deserializeWebSocketMessage(binaryMessage: Uint8Array): Promise<DecodedWebcastPushFrame>;
export declare function validateAndNormalizeUniqueId(uniqueId: string): string;
export declare function userAgentToDevicePreset(userAgent: string): DevicePreset;
export declare function generateDeviceId(): string;
//# sourceMappingURL=utilities.d.ts.map