"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const utilities_1 = require("../../../lib/utilities");
const cookie_jar_1 = __importDefault(require("../../../lib/web/lib/cookie-jar"));
const config_1 = __importDefault(require("../../../lib/config"));
const api_1 = require("@eulerstream/euler-api-sdk/dist/sdk/api");
const lib_1 = require("../../../lib");
class WebcastHttpClient {
    configuration;
    webSigner;
    // HTTP Request Client
    axiosInstance;
    // External Cookie Jar
    cookieJar;
    // Internal Client Parameter Store
    clientParams;
    constructor(configuration = {
        customHeaders: {},
        axiosOptions: {},
        clientParams: {},
        authenticateWs: false,
        signApiKey: undefined
    }, webSigner = new lib_1.EulerSigner({ apiKey: configuration.signApiKey })) {
        this.configuration = configuration;
        this.webSigner = webSigner;
        this.axiosInstance = axios_1.default.create({
            timeout: parseInt(process.env.TIKTOK_CLIENT_TIMEOUT || '10000'),
            headers: { ...config_1.default.DEFAULT_HTTP_CLIENT_HEADERS, ...this.configuration.customHeaders },
            ...this.configuration.axiosOptions
        });
        this.clientParams = {
            ...config_1.default.DEFAULT_HTTP_CLIENT_PARAMS,
            ...this.configuration.clientParams
        };
        // Create the cookie jar
        this.cookieJar = new cookie_jar_1.default(this.axiosInstance);
        // Process the cookie header
        if (!!this.configuration.customHeaders?.Cookie) {
            const cookieHeader = this.configuration.customHeaders.Cookie;
            delete this.configuration.customHeaders['Cookie'];
            cookieHeader.split('; ').forEach((v) => this.cookieJar.processSetCookieHeader(v));
        }
    }
    /**
     * Set the Room ID for the client
     * @param roomId The client's Room ID
     */
    set roomId(roomId) {
        this.clientParams.room_id = roomId;
    }
    /**
     * Get the Room ID for the client
     */
    get roomId() {
        return this.clientParams.room_id || '';
    }
    /**
     * Build the URL for the request
     *
     * @param host The host for the request
     * @param path The path for the request
     * @param params The query parameters for the request
     * @param signRequest Whether to sign the request or not
     * @param method The HTTP method for the request
     * @param headers The headers for the request
     * @param extraOptions Additional axios request options
     * @protected
     */
    async request({ host, path, params, signRequest, method = 'GET', headers, ...extraOptions }) {
        // Build the initial URL
        let secure = !(host.startsWith('127.0.0.1') || host.startsWith('localhost') || host.startsWith('::1'));
        let url = `http${secure ? 's' : ''}://${host}/${path}?${new URLSearchParams(params || {})}`;
        // Sign the request. Assumption is if it doesn't throw, it worked.
        if (signRequest) {
            const signMethod = Object.values(api_1.ISignTikTokUrlBodyMethodEnum).includes(method.toUpperCase());
            if (!signMethod) {
                throw new Error(`Invalid method for signing: ${method}. Must be one of ${Object.values(api_1.ISignTikTokUrlBodyMethodEnum).join(', ')}`);
            }
            const signResponse = await this.webSigner.webcastSign(url, method.toUpperCase(), this.axiosInstance.defaults.headers['User-Agent'], this.cookieJar.sessionId, this.cookieJar.ttTargetIdc);
            url = signResponse.response.signedUrl;
            headers ||= {};
            headers['User-Agent'] = signResponse.response.userAgent;
        }
        // Execute the request
        return this.axiosInstance.request({
            url: url,
            headers: headers ?? undefined,
            method: method,
            ...extraOptions
        });
    }
    /**
     * Get HTML from TikTok website
     *
     * @param path Path to the HTML page
     * @param options Additional request options
     */
    async getHtmlFromTikTokWebsite(path, options = {}) {
        const fetchResponse = await this.request({
            host: config_1.default.TIKTOK_HOST_WEB,
            path: path,
            responseType: 'text',
            signRequest: false,
            ...options
        });
        return fetchResponse.data;
    }
    /**
     * Get deserialized object from Webcast API
     *
     * @param path Path to the API endpoint
     * @param params Query parameters to be sent with the request
     * @param schemaName Schema name for deserialization
     * @param signRequest Whether to sign the request or not
     * @param options Additional request options
     */
    async getDeserializedObjectFromWebcastApi(path, params, schemaName, signRequest = false, options = {}) {
        const fetchResponse = await this.request({
            host: config_1.default.TIKTOK_HOST_WEBCAST,
            path: 'webcast/' + path,
            params: params,
            signRequest: signRequest,
            responseType: 'arraybuffer',
            ...options
        });
        return (0, utilities_1.deserializeMessage)(schemaName, fetchResponse.data);
    }
    async postJsonObjectToWebcastApi(path, params, data, signRequest = false, options = {}) {
        options.headers ||= {};
        options.headers['Content-Type'] = 'application/json; charset=UTF-8';
        const fetchResponse = await this.request({
            host: config_1.default.TIKTOK_HOST_WEBCAST,
            path: 'webcast/' + path,
            data: data,
            params: params,
            responseType: 'json',
            signRequest: signRequest,
            method: 'POST',
            ...options
        });
        return fetchResponse.data;
    }
    /**
     * Get JSON object from Webcast API
     *
     * @param path Path to the API endpoint
     * @param params Query parameters to be sent with the request
     * @param signRequest Whether to sign the request or not
     * @param options Additional request options
     */
    async getJsonObjectFromWebcastApi(path, params, signRequest = false, options = {}) {
        options.headers = {};
        const fetchResponse = await this.request({
            host: config_1.default.TIKTOK_HOST_WEBCAST,
            path: 'webcast/' + path,
            params: params,
            responseType: 'json',
            signRequest: signRequest,
            headers: {
                ...options.headers
            },
            ...options
        });
        return fetchResponse.data;
    }
    /**
     * Get JSON object from TikTok API
     *
     * @param path Path to the API endpoint
     * @param params Query parameters to be sent with the request
     * @param signRequest Whether to sign the request or not
     * @param options Additional request options
     */
    async getJsonObjectFromTikTokApi(path, params, signRequest = false, options = {}) {
        const fetchResponse = await this.request({
            host: config_1.default.TIKTOK_HOST_WEB,
            path: path,
            params: params,
            responseType: 'json',
            signRequest: signRequest,
            ...options
        });
        return fetchResponse.data;
    }
}
exports.default = WebcastHttpClient;
//# sourceMappingURL=http-client.js.map