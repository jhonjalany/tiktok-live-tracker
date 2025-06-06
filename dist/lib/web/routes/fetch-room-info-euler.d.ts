import { Route } from '../../../types/route';
import { IWebcastRoomInfoRouteResponse } from '@eulerstream/euler-api-sdk';
import { AxiosRequestConfig } from 'axios';
export declare type FetchRoomInfoFromEulerRouteParams = {
    uniqueId: string;
    options?: AxiosRequestConfig;
};
export declare class FetchRoomInfoFromEulerRoute extends Route<FetchRoomInfoFromEulerRouteParams, IWebcastRoomInfoRouteResponse> {
    call({ uniqueId, options }: {
        uniqueId: any;
        options: any;
    }): Promise<IWebcastRoomInfoRouteResponse>;
}
//# sourceMappingURL=fetch-room-info-euler.d.ts.map