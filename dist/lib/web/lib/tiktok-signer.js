"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EulerSigner = void 0;
const errors_1 = require("../../../types/errors");
const euler_api_sdk_1 = __importDefault(require("@eulerstream/euler-api-sdk"));
const lib_1 = require("../../../lib");
/**
 * TikTok Signer class
 */
class EulerSigner extends euler_api_sdk_1.default {
    constructor(config = {}) {
        super({ ...lib_1.SignConfig, ...config });
    }
    /**
     * Sign a URL using the TikTok signature provider
     *
     * @param url The URL to sign
     * @param method The HTTP method to use (GET, POST, etc.)
     * @param userAgent The user agent to sign with
     * @param sessionId The session ID to use (optional)
     * @param ttTargetIdc The target IDC to use (optional)
     */
    async webcastSign(url, method, userAgent, sessionId, ttTargetIdc) {
        const mustRemoveParams = ['X-Bogus', 'X-Gnarly', 'msToken'];
        let cleanUrl = typeof url === 'string' ? url : url.toString();
        for (const param of mustRemoveParams) {
            cleanUrl = cleanUrl.replace(new RegExp(`([&?])${param}=[^&]*`, 'g'), '$1');
            cleanUrl = cleanUrl.replace(/[&?]$/, '');
        }
        if (sessionId && !ttTargetIdc) {
            throw new Error('ttTargetIdc must be set when sessionId is provided.');
        }
        // Sign the URL
        const response = await this.webcast.signWebcastUrl({
            url: cleanUrl,
            method: method,
            userAgent: userAgent,
            sessionId: sessionId,
            ttTargetIdc: ttTargetIdc
        });
        if (response.status === 403) {
            throw new errors_1.PremiumFeatureError('You do not have permission from the signature provider to sign this URL.', response.data.message, JSON.stringify(response.data));
        }
        if (!response.data || Object.keys(response.data.response.tokens || {}).length < 1) {
            throw new errors_1.SignatureMissingTokensError('Failed to sign a request due to missing tokens in response!');
        }
        if (response.status !== 200) {
            throw new errors_1.SignatureMissingTokensError(`Failed to sign a request: ${response?.data?.message || 'Unknown error'}`);
        }
        return response.data;
    }
}
exports.EulerSigner = EulerSigner;
//# sourceMappingURL=tiktok-signer.js.map