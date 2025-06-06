"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebcastPushConnection = void 0;
const data_converter_1 = require("../../lib/_legacy/data-converter");
const lib_1 = require("../../lib");
const events_1 = require("../../types/events");
/**
 * The legacy WebcastPushConnection class for backwards compatibility.
 * @deprecated Use TikTokLiveConnection instead.
 */
class WebcastPushConnection extends lib_1.TikTokLiveConnection {
    async processProtoMessageFetchResult(fetchResult) {
        fetchResult.messages.forEach((message) => {
            this.emit(events_1.ControlEvent.RAW_DATA, message.type, message.payload);
        });
        // Process and emit decoded data depending on the message type
        fetchResult.messages
            .forEach((message) => {
            let simplifiedObj = (0, data_converter_1.simplifyObject)(message.type, message.decodedData?.data || {});
            this.emit(events_1.ControlEvent.DECODED_DATA, message.type, simplifiedObj, message.payload);
            switch (message.type) {
                case 'WebcastControlMessage':
                    // Known control actions:
                    // 3 = Stream terminated by user
                    // 4 = Stream terminated by platform moderator (ban)
                    const action = message.decodedData.data.action;
                    if ([3, 4].includes(action)) {
                        this.emit(events_1.WebcastEvent.STREAM_END, { action });
                        this.disconnect();
                    }
                    break;
                case 'WebcastRoomUserSeqMessage':
                    this.emit(events_1.WebcastEvent.ROOM_USER, simplifiedObj);
                    break;
                case 'WebcastChatMessage':
                    this.emit(events_1.WebcastEvent.CHAT, simplifiedObj);
                    break;
                case 'WebcastMemberMessage':
                    this.emit(events_1.WebcastEvent.MEMBER, simplifiedObj);
                    break;
                case 'WebcastGiftMessage':
                    // Add extended gift info if option enabled
                    if (Array.isArray(this.availableGifts) && simplifiedObj.giftId) {
                        simplifiedObj.extendedGiftInfo = this.availableGifts.find((x) => x.id === simplifiedObj.giftId);
                    }
                    this.emit(events_1.WebcastEvent.GIFT, simplifiedObj);
                    break;
                case 'WebcastSocialMessage':
                    this.emit(events_1.WebcastEvent.SOCIAL, simplifiedObj);
                    if (simplifiedObj.displayType?.includes('follow')) {
                        this.emit(events_1.WebcastEvent.FOLLOW, simplifiedObj);
                    }
                    if (simplifiedObj.displayType?.includes('share')) {
                        this.emit(events_1.WebcastEvent.SHARE, simplifiedObj);
                    }
                    break;
                case 'WebcastLikeMessage':
                    this.emit(events_1.WebcastEvent.LIKE, simplifiedObj);
                    break;
                case 'WebcastQuestionNewMessage':
                    this.emit(events_1.WebcastEvent.QUESTION_NEW, simplifiedObj);
                    break;
                case 'WebcastLinkMicBattle':
                    this.emit(events_1.WebcastEvent.LINK_MIC_BATTLE, simplifiedObj);
                    break;
                case 'WebcastLinkMicArmies':
                    this.emit(events_1.WebcastEvent.LINK_MIC_ARMIES, simplifiedObj);
                    break;
                case 'WebcastLiveIntroMessage':
                    this.emit(events_1.WebcastEvent.LIVE_INTRO, simplifiedObj);
                    break;
                case 'WebcastEmoteChatMessage':
                    this.emit(events_1.WebcastEvent.EMOTE, simplifiedObj);
                    break;
                case 'WebcastEnvelopeMessage':
                    this.emit(events_1.WebcastEvent.ENVELOPE, simplifiedObj);
                    break;
                case 'WebcastSubNotifyMessage':
                    this.emit(events_1.WebcastEvent.SUBSCRIBE, simplifiedObj);
                    break;
            }
        });
    }
}
exports.WebcastPushConnection = WebcastPushConnection;
//# sourceMappingURL=legacy-client.js.map