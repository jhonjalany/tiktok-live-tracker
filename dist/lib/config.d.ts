import { IWebcastConfig } from '../types/client';
import { ClientConfiguration } from '@eulerstream/euler-api-sdk';
export declare type LocationPreset = {
    lang: string;
    lang_country: string;
    country: string;
    tz_name: string;
};
export declare type DevicePreset = {
    browser_version: string;
    browser_name: string;
    browser_platform: string;
    user_agent: string;
    os: string;
};
export declare type ScreenPreset = {
    screen_width: number;
    screen_height: number;
};
export declare const Locations: LocationPreset[];
export declare const Screens: ScreenPreset[];
export declare const UserAgents: string[];
export declare const Devices: DevicePreset[];
export declare const Device: DevicePreset;
export declare const Location: LocationPreset;
export declare const Screen: ScreenPreset;
declare const Config: IWebcastConfig;
export declare const SignConfig: Partial<ClientConfiguration>;
export default Config;
//# sourceMappingURL=config.d.ts.map