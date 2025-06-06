import { Route } from '../../../types/route';
export declare type FetchRoomInfoFromApiRouteParams = {
    uniqueId: string;
};
export declare type FetchRoomInfoFromApiRouteResponse = {
    statusCode: number;
    message?: string;
    data?: {
        user?: Record<string, any> & {
            roomId: string;
        };
        liveRoom?: Record<string, any> & {
            status: number;
            roomId: string;
        };
    };
};
export declare class FetchRoomInfoFromApiLiveRoute extends Route<FetchRoomInfoFromApiRouteParams, FetchRoomInfoFromApiRouteResponse> {
    call({ uniqueId }: {
        uniqueId: any;
    }): Promise<FetchRoomInfoFromApiRouteResponse>;
}
//# sourceMappingURL=fetch-room-info-api-live.d.ts.map