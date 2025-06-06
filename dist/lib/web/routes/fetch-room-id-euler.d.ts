import { Route } from '../../../types/route';
import { IWebcastRoomIdRouteResponse } from '@eulerstream/euler-api-sdk';
import { AxiosRequestConfig } from 'axios';
export declare type FetchRoomIdFromEulerRouteParams = {
    uniqueId: string;
    options?: AxiosRequestConfig;
};
export declare class FetchRoomIdFromEulerRoute extends Route<FetchRoomIdFromEulerRouteParams, IWebcastRoomIdRouteResponse> {
    call({ uniqueId, options }: {
        uniqueId: any;
        options: any;
    }): Promise<IWebcastRoomIdRouteResponse>;
}
//# sourceMappingURL=fetch-room-id-euler.d.ts.map