"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetchSignedWebSocketFromEulerRoute = void 0;
const route_1 = require("../../../types/route");
const errors_1 = require("../../../types/errors");
const config_1 = __importDefault(require("../../../lib/config"));
const lib_1 = require("../../../lib");
class FetchSignedWebSocketFromEulerRoute extends route_1.Route {
    async call({ roomId, uniqueId, preferredAgentIds, sessionId, ttTargetIdc }) {
        if (!roomId && !uniqueId) {
            throw new errors_1.FetchSignedWebSocketIdentityParameterError('Either roomId or uniqueId must be provided.');
        }
        if (roomId && uniqueId) {
            throw new errors_1.FetchSignedWebSocketIdentityParameterError('Both roomId and uniqueId cannot be provided at the same time.');
        }
        const preferredAgentIdsParam = preferredAgentIds?.join(',') ?? null;
        const resolvedSessionId = sessionId || this.webClient.cookieJar.sessionId;
        const resolvedTtTargetIdc = ttTargetIdc || this.webClient.cookieJar.ttTargetIdc;
        if (resolvedSessionId && !resolvedTtTargetIdc) {
            throw new errors_1.FetchSignedWebSocketIdentityParameterError('ttTargetIdc must be set when sessionId is provided.');
        }
        if (this.webClient.configuration.authenticateWs && resolvedSessionId) {
            const envHost = process.env.WHITELIST_AUTHENTICATED_SESSION_ID_HOST;
            const expectedHost = new URL(this.webClient.webSigner.configuration.basePath).host;
            if (!envHost) {
                throw new errors_1.AuthenticatedWebSocketConnectionError(`authenticate_websocket is true, but no whitelist host defined. Set the env var WHITELIST_AUTHENTICATED_SESSION_ID_HOST to proceed.`);
            }
            if (envHost !== expectedHost) {
                throw new errors_1.AuthenticatedWebSocketConnectionError(`The env var WHITELIST_AUTHENTICATED_SESSION_ID_HOST "${envHost}" does not match sign server host "${expectedHost}".`);
            }
        }
        let response;
        try {
            response = await this.webClient.webSigner.webcast.fetchWebcastURL('ttlive-node', roomId, uniqueId, this.webClient.clientParams?.cursor ?? undefined, resolvedSessionId, config_1.default.DEFAULT_HTTP_CLIENT_HEADERS['User-Agent'], preferredAgentIdsParam, resolvedTtTargetIdc, { responseType: 'arraybuffer' });
        }
        catch (err) {
            throw new errors_1.SignAPIError(errors_1.ErrorReason.CONNECT_ERROR, undefined, undefined, 'Failed to connect to sign server.', null, err);
        }
        if (response.status === 429) {
            // Convert arraybuffer to JSON
            const data = JSON.parse(Buffer.from(response.data).toString('utf-8'));
            const message = process.env.SIGN_SERVER_MESSAGE_DISABLED ? null : data?.message;
            const label = data?.limit_label ? `(${data.limit_label}) ` : '';
            throw new errors_1.SignatureRateLimitError(message, `${label}Too many connections started, try again later.`, response);
        }
        if (response.status === 402) {
            // Convert arraybuffer to JSON
            const data = JSON.parse(Buffer.from(response.data).toString('utf-8'));
            const message = process.env.SIGN_SERVER_MESSAGE_DISABLED ? null : data?.message;
            throw new errors_1.PremiumFeatureError(message, 'Error fetching the signed TikTok WebSocket');
        }
        const logId = response.headers['X-Log-Id'] && parseInt(response.headers['X-Log-Id']);
        const agentId = response.headers['X-Agent-ID'];
        if (response.status !== 200) {
            let payload;
            try {
                payload = Buffer.from(response.data).toString('utf-8');
            }
            catch {
                payload = `"${response.statusText}"`;
            }
            throw new errors_1.SignAPIError(errors_1.ErrorReason.SIGN_NOT_200, logId, agentId, `Unexpected sign server status ${response.status}. Payload:\n${payload}`);
        }
        if (!response.headers['x-set-tt-cookie']) {
            throw new errors_1.SignAPIError(errors_1.ErrorReason.EMPTY_COOKIES, logId, agentId, 'No cookies received from sign server.');
        }
        this.webClient.cookieJar.processSetCookieHeader(response.headers['x-set-tt-cookie'] || '');
        this.webClient.roomId = response.headers['x-room-id'] || this.webClient.roomId;
        return (0, lib_1.deserializeMessage)('ProtoMessageFetchResult', Buffer.from(response.data));
    }
}
exports.FetchSignedWebSocketFromEulerRoute = FetchSignedWebSocketFromEulerRoute;
//# sourceMappingURL=fetch-signed-websocket-euler.js.map