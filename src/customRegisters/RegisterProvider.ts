import { ProxonNS } from "../ProxonTools";
import { TempPanelRegister } from "./TempPanelRegister";


const Store: any={
    TempPanelRegister
}

export interface IRegisterProvider{
    getRegisterValue( register: ProxonNS.Register):number;
    getInputRegisters( register: ProxonNS.Register, value: number):ProxonNS.Inputs;
}

export class RegisterProvider{
    public static getProvider( className:string, options:any):IRegisterProvider{
        return (new Store[className](options) as IRegisterProvider);
    }
}