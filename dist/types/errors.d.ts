import { AxiosResponse } from 'axios';
declare class ConnectError extends Error {
    constructor(message: string);
}
export declare class InvalidUniqueIdError extends Error {
}
export declare class FetchIsLiveError extends Error {
    readonly errors: Error[];
    constructor(errors: Error[], ...args: any[]);
}
export declare class InvalidResponseError extends Error {
    readonly requestErr: Error;
    constructor(message: string, requestErr?: Error);
}
export declare class MissingRoomIdError extends Error {
}
export declare class AlreadyConnectingError extends ConnectError {
}
export declare class AlreadyConnectedError extends ConnectError {
}
export declare class UserOfflineError extends ConnectError {
}
export declare class InvalidSchemaNameError extends Error {
}
export declare class TikTokLiveError extends Error {
    constructor(message: string);
}
export declare enum ErrorReason {
    RATE_LIMIT = "Rate Limited",
    CONNECT_ERROR = "Connect Error",
    EMPTY_PAYLOAD = "Empty Payload",
    SIGN_NOT_200 = "Sign Error",
    EMPTY_COOKIES = "Empty Cookies",
    PREMIUM_FEATURE = "Premium Feature",
    AUTHENTICATED_WS = "Authenticated WS"
}
export declare class FetchSignedWebSocketIdentityParameterError extends Error {
}
export declare class SignAPIError extends TikTokLiveError {
    reason: ErrorReason;
    readonly logId?: number;
    readonly agentId?: string;
    constructor(reason: ErrorReason, logId?: number, agentId?: string, ...args: (string | undefined)[]);
    static formatSignServerMessage(message: string): string;
}
export declare class SignatureRateLimitError extends SignAPIError {
    readonly retryAfter: number;
    readonly resetTime?: number;
    constructor(apiMessage: string | undefined, formatStr: string, response: AxiosResponse);
    private static parseHeaderNumber;
    private static calculateRetryAfter;
    private static calculateResetTime;
}
export declare class SignatureMissingTokensError extends SignAPIError {
    constructor(...args: string[]);
}
export declare class PremiumFeatureError extends SignAPIError {
    constructor(apiMessage: string, ...args: string[]);
}
export declare class AuthenticatedWebSocketConnectionError extends SignAPIError {
    constructor(...args: string[]);
}
export {};
//# sourceMappingURL=errors.d.ts.map