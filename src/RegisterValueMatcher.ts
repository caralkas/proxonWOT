import { Value } from "webthing";
import { ProxonNS } from "./ProxonTools";

interface RegisterValue{
    device: ProxonNS.DeviceType;
    type: ProxonNS.RegisterType;
    register: number;
    value: Value
}

export class RegisterValueMatcher{
    private mapping: RegisterValue[]=[];

    /**
     * Add a ModbusRegister to WebThing Property-Value mapping.
     * 
     * @param device Proxon Device Type
     * @param type Modbus Register Type
     * @param register Modbus Register
     * @param value WebThing Value
     */
    addMapping(device: ProxonNS.DeviceType, type: ProxonNS.RegisterType, register:number, value: Value):void{
        this.mapping.push({
            device: device,
            type: type,
            register: register,
            value: value
        });        
    } 
    
    /**
     * Get the WebThing Property-Value assigned to a ModbusRegister.
     * 
     * @param device Proxon Device Type
     * @param type Modbus Register Type
     * @param register Modbus Register
     * @returns WebThing Value
     */
    public getMapping(device: ProxonNS.DeviceType, type: ProxonNS.RegisterType, register:number):Value<any>[]{
        //Get correct entries for Query and return their assigned Value properties.
        return this.mapping.filter((elem: RegisterValue)=>{
            if (elem.device === device && elem.type === type && elem.register === register) return elem;
        }).map(e=> e.value );
    }
}