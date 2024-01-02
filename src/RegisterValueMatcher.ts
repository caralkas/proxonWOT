import { Value } from "webthing";
import { ProxonNS } from "./ProxonTools";
import { Proxon } from "./Proxon";

interface RegisterValue{
    device: ProxonNS.DeviceType;
    type: ProxonNS.RegisterType;
    register: number;
    value: Value
}

export class RegisterValueMatcher{
    private mapping: RegisterValue[]=[];

    addMapping(device: ProxonNS.DeviceType, type: ProxonNS.RegisterType, register:number, value: Value):void{
        this.mapping.push({
            device: device,
            type: type,
            register: register,
            value: value
        });        
    } 

    
    public getMapping(device: ProxonNS.DeviceType, type: ProxonNS.RegisterType, register:number):Value<any>[]{
        //Get correct entries for Query and return their assigned Value properties.
        return this.mapping.filter((elem: RegisterValue)=>{
            if (elem.device === device && elem.type === type && elem.register === register) return elem;
        }).map(e=> e.value );
    }
}