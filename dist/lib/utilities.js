"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeviceId = exports.userAgentToDevicePreset = exports.validateAndNormalizeUniqueId = exports.deserializeWebSocketMessage = exports.deserializeMessage = exports.WebcastDeserializeConfig = void 0;
const tikTokSchema = __importStar(require("../types/tiktok-schema"));
const tiktok_schema_1 = require("../types/tiktok-schema");
const zlib = __importStar(require("node:zlib"));
const util = __importStar(require("node:util"));
const errors_1 = require("../types/errors");
const unzip = util.promisify(zlib.unzip);
const webcastEvents = Object.keys(tikTokSchema).filter((message) => message.startsWith('Webcast'));
exports.WebcastDeserializeConfig = {
    skipMessageTypes: []
};
/**
 * Find the messages defined in the TikTok protobuf schema
 */
async function getTikTokSchemaNames() {
    return Object.keys(tikTokSchema);
}
/**
 * Find the Webcast messages defined in the TikTok protobuf schema
 */
async function getWebcastEvents() {
    return (await getTikTokSchemaNames()).filter((message) => message.startsWith('Webcast'));
}
function deserializeMessage(protoName, binaryMessage) {
    const messageFn = tikTokSchema[protoName];
    if (!messageFn)
        throw new errors_1.InvalidSchemaNameError(`Invalid schema name: ${protoName}`);
    const deserializedMessage = messageFn.decode(binaryMessage);
    // Handle ProtoMessageFetchResult nested messages
    if (protoName === 'ProtoMessageFetchResult') {
        for (const message of deserializedMessage.messages || []) {
            if (exports.WebcastDeserializeConfig.skipMessageTypes.includes(message.type)) {
                continue;
            }
            if (!webcastEvents.includes(message.type)) {
                continue;
            }
            message.decodedData = {
                type: message.type,
                data: deserializeMessage(message.type, Buffer.from(message.payload))
            };
        }
    }
    return deserializedMessage;
}
exports.deserializeMessage = deserializeMessage;
async function deserializeWebSocketMessage(binaryMessage) {
    // Websocket messages are in a container which contains additional data
    // Message type 'msg' represents a normal WebcastResponse
    const rawWebcastWebSocketMessage = tiktok_schema_1.WebcastPushFrame.decode(binaryMessage);
    let protoMessageFetchResult = undefined;
    if (rawWebcastWebSocketMessage.type === 'msg') {
        let binary = rawWebcastWebSocketMessage.binary;
        // Decompress binary (if gzip compressed)
        // https://www.rfc-editor.org/rfc/rfc1950.html
        if (binary && binary.length > 2 && binary[0] === 0x1f && binary[1] === 0x8b && binary[2] === 0x08) {
            rawWebcastWebSocketMessage.binary = await unzip(binary);
        }
        protoMessageFetchResult = deserializeMessage('ProtoMessageFetchResult', Buffer.from(rawWebcastWebSocketMessage.binary));
    }
    const decodedContainer = rawWebcastWebSocketMessage;
    decodedContainer.protoMessageFetchResult = protoMessageFetchResult;
    return decodedContainer;
}
exports.deserializeWebSocketMessage = deserializeWebSocketMessage;
function validateAndNormalizeUniqueId(uniqueId) {
    if (typeof uniqueId !== 'string') {
        throw new errors_1.InvalidUniqueIdError('Missing or invalid value for \'uniqueId\'. Please provide the username from TikTok URL.');
    }
    // Support full URI
    uniqueId = uniqueId.replace('https://www.tiktok.com/', '');
    uniqueId = uniqueId.replace('/live', '');
    uniqueId = uniqueId.replace('@', '');
    uniqueId = uniqueId.trim();
    return uniqueId;
}
exports.validateAndNormalizeUniqueId = validateAndNormalizeUniqueId;
function userAgentToDevicePreset(userAgent) {
    const firstSlash = userAgent.indexOf('/');
    const browserName = userAgent.substring(0, firstSlash);
    const browserVersion = userAgent.substring(firstSlash + 1);
    return {
        user_agent: userAgent,
        browser_name: browserName,
        browser_version: browserVersion,
        browser_platform: userAgent.includes('Macintosh') ? 'MacIntel' : 'Win32',
        os: userAgent.includes('Macintosh') ? 'mac' : 'windows'
    };
}
exports.userAgentToDevicePreset = userAgentToDevicePreset;
function generateDeviceId() {
    let digits = '';
    for (let i = 0; i < 19; i++) {
        digits += Math.floor(Math.random() * 10);
    }
    return digits;
}
exports.generateDeviceId = generateDeviceId;
//# sourceMappingURL=utilities.js.map