import { ProxonNS } from "../ProxonTools";
import { TempPanelRegister } from "./TempPanelRegister";


const Store: any={
    TempPanelRegister
}

export interface IRegisterProvider{
    readRegister( register: ProxonNS.Register):Promise<number>;
    writeRegister( register: ProxonNS.Register, value: number):Promise<void>;
}

export class RegisterProvider{
    public static getProvider( className:string, options:any):IRegisterProvider{
        return (new Store[className](options) as IRegisterProvider);
    }
}