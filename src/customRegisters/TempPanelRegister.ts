import { error } from "console";
import { Proxon } from "../Proxon";
import { ProxonNS } from "../ProxonTools";
import { IRegisterProvider } from "./RegisterProvider";

export class TempPanelRegister implements IRegisterProvider {
  private result: ProxonNS.Results;
  private device: ProxonNS.DeviceType;

  /**
   * Creates a new Custom Register Provider for Temperature Panels.
   * It requires two properties in the options parameter:
   *  - "result" holds the current register values the Temperature depends on.
   *  - "device" The Proxon Device Type
   *
   * @param options Parameters formatted as { result: ProxonNS.Results }
   */
  constructor(options: any) {
    //If result is passed set it to class variables
    if (options["result"]) this.result = options.result;
    else this.result = {} as ProxonNS.Results;
    if (options["device"]) {
      this.device = options["device"] as ProxonNS.DeviceType;
    } else {
      throw new Error("Missing Device definition");
    }
  }

  readRegister(register: ProxonNS.Register): Promise<number> {
    let ofsType:number , ofsReg: number, midType: number, midReg: number;
    let midTemp = 0;
    let ofsTemp = 0;
    let tempS;

    //First transform supplied parameters
    try {
      ofsType = register.options["offset"]["type"];
      ofsReg = register.options["offset"]["register"];
      midType = register.options["middle"]["type"];
      midReg = register.options["middle"]["register"];      
    } catch (error) {
      throw error;
    }
    if (!(ofsType && ofsReg && midType && midReg)) throw new Error("Parameter incomplete");

    //Get middle temperature
    tempS = this.result.find((elem)=>{
      if (elem.device===this.device && elem.type === midType && elem.register === midReg ) return true;
    })?.value;
    if (tempS){
      midTemp = Number.parseInt(tempS);
    }
    //Get offset temperature
    tempS = this.result.find((elem)=>{
      if (elem.device===this.device && elem.type === ofsType && elem.register === ofsReg ) return true;
    })?.value;
    if (tempS){
      ofsTemp = Number.parseInt(tempS);
    }

    //Return sum of middle and offset temperature
    return new Promise((resolve, reject) => {
      resolve(midTemp+ofsTemp);
    });
  }

  writeRegister(register: ProxonNS.Register, value: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  private getValueFromResult(
    type: ProxonNS.RegisterType,
    number: number
  ): number {
    const value = this.result.find((elem) => {
      if (
        elem.device === this.device &&
        elem.type === type &&
        elem.register === number
      )
        return true;
    })?.value;
    if (value) return Number.parseFloat(value);
    else return 0.0;
  }
}
