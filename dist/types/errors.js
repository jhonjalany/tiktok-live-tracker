"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticatedWebSocketConnectionError = exports.PremiumFeatureError = exports.SignatureMissingTokensError = exports.SignatureRateLimitError = exports.SignAPIError = exports.FetchSignedWebSocketIdentityParameterError = exports.ErrorReason = exports.TikTokLiveError = exports.InvalidSchemaNameError = exports.UserOfflineError = exports.AlreadyConnectedError = exports.AlreadyConnectingError = exports.MissingRoomIdError = exports.InvalidResponseError = exports.FetchIsLiveError = exports.InvalidUniqueIdError = void 0;
class ConnectError extends Error {
    constructor(message) {
        super(message);
    }
}
class InvalidUniqueIdError extends Error {
}
exports.InvalidUniqueIdError = InvalidUniqueIdError;
class FetchIsLiveError extends Error {
    errors;
    constructor(errors, ...args) {
        super();
        this.errors = errors;
    }
}
exports.FetchIsLiveError = FetchIsLiveError;
class InvalidResponseError extends Error {
    requestErr;
    constructor(message, requestErr = undefined) {
        super(message);
        this.requestErr = requestErr;
        this.name = 'InvalidResponseError';
    }
}
exports.InvalidResponseError = InvalidResponseError;
class MissingRoomIdError extends Error {
}
exports.MissingRoomIdError = MissingRoomIdError;
class AlreadyConnectingError extends ConnectError {
}
exports.AlreadyConnectingError = AlreadyConnectingError;
class AlreadyConnectedError extends ConnectError {
}
exports.AlreadyConnectedError = AlreadyConnectedError;
class UserOfflineError extends ConnectError {
}
exports.UserOfflineError = UserOfflineError;
class InvalidSchemaNameError extends Error {
}
exports.InvalidSchemaNameError = InvalidSchemaNameError;
class TikTokLiveError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
exports.TikTokLiveError = TikTokLiveError;
var ErrorReason;
(function (ErrorReason) {
    ErrorReason["RATE_LIMIT"] = "Rate Limited";
    ErrorReason["CONNECT_ERROR"] = "Connect Error";
    ErrorReason["EMPTY_PAYLOAD"] = "Empty Payload";
    ErrorReason["SIGN_NOT_200"] = "Sign Error";
    ErrorReason["EMPTY_COOKIES"] = "Empty Cookies";
    ErrorReason["PREMIUM_FEATURE"] = "Premium Feature";
    ErrorReason["AUTHENTICATED_WS"] = "Authenticated WS";
})(ErrorReason = exports.ErrorReason || (exports.ErrorReason = {}));
class FetchSignedWebSocketIdentityParameterError extends Error {
}
exports.FetchSignedWebSocketIdentityParameterError = FetchSignedWebSocketIdentityParameterError;
class SignAPIError extends TikTokLiveError {
    reason;
    logId;
    agentId;
    constructor(reason, logId, agentId, ...args) {
        super([`[${reason}]`, ...args].join(' '));
        this.reason = reason;
        this.logId = logId;
        this.agentId = agentId;
    }
    static formatSignServerMessage(message) {
        message = message.trim();
        const msgLen = message.length;
        const headerText = 'SIGN SERVER MESSAGE';
        const headerLen = Math.floor((msgLen - headerText.length) / 2);
        const paddingLen = (msgLen - headerText.length) % 2;
        const footer = '+' + '-'.repeat(msgLen + 2) + '+';
        const header = '+' + '-'.repeat(headerLen) + ' ' + headerText + ' ' + '-'.repeat(headerLen + paddingLen) + '+';
        const prefix = '|' + ' '.repeat(header.length - 2) + '|';
        const body = '| ' + message + ' |';
        return `\n\t${prefix}\n\t${header}\n\t${body}\n\t${footer}\n`;
    }
}
exports.SignAPIError = SignAPIError;
class SignatureRateLimitError extends SignAPIError {
    retryAfter;
    resetTime;
    constructor(apiMessage, formatStr, response) {
        const retryAfter = SignatureRateLimitError.calculateRetryAfter(response);
        const resetTime = SignatureRateLimitError.calculateResetTime(response);
        const logId = SignatureRateLimitError.parseHeaderNumber(response.headers['X-Log-ID']);
        const agentId = response.headers['X-Agent-ID'];
        const formattedMsg = formatStr.replace('%s', retryAfter.toString());
        const args = [formattedMsg];
        if (apiMessage) {
            const serverMsg = SignAPIError.formatSignServerMessage(apiMessage);
            args.push(serverMsg);
        }
        super(ErrorReason.RATE_LIMIT, logId, agentId, ...args);
        this.retryAfter = retryAfter;
        this.resetTime = resetTime;
    }
    static parseHeaderNumber(value) {
        return value ? parseInt(value) : undefined;
    }
    static calculateRetryAfter(response) {
        const retryAfter = parseInt(response.headers['retry-after'] || '0');
        return retryAfter * 1000;
    }
    static calculateResetTime(response) {
        const value = response.headers['x-ratelimit-reset'];
        return value ? parseInt(value) * 1000 : undefined;
    }
}
exports.SignatureRateLimitError = SignatureRateLimitError;
class SignatureMissingTokensError extends SignAPIError {
    constructor(...args) {
        super(ErrorReason.EMPTY_PAYLOAD, undefined, undefined, ...args);
    }
}
exports.SignatureMissingTokensError = SignatureMissingTokensError;
class PremiumFeatureError extends SignAPIError {
    constructor(apiMessage, ...args) {
        args.push(SignAPIError.formatSignServerMessage(apiMessage));
        super(ErrorReason.PREMIUM_FEATURE, undefined, undefined, ...args);
    }
}
exports.PremiumFeatureError = PremiumFeatureError;
class AuthenticatedWebSocketConnectionError extends SignAPIError {
    constructor(...args) {
        super(ErrorReason.AUTHENTICATED_WS, undefined, undefined, ...args);
    }
}
exports.AuthenticatedWebSocketConnectionError = AuthenticatedWebSocketConnectionError;
//# sourceMappingURL=errors.js.map