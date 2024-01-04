import { error } from "console";
import { Proxon } from "../Proxon";
import { ProxonNS, ProxonTools } from "../ProxonTools";
import { IRegisterProvider } from "./RegisterProvider";

export class TempPanelRegister implements IRegisterProvider {
  private result: ProxonNS.Results;
  private device: ProxonNS.DeviceType;
  private registers: ProxonNS.Registers;

  /**
   * Creates a new Custom Register Provider for Temperature Panels.
   * It requires two properties in the options parameter:
   *  - "result" holds the current register values the Temperature depends on.
   *  - "device" The Proxon Device Type
   *
   * @param options Parameters formatted as { result: ProxonNS.Results }
   */
  constructor(options: any) {
    //Mandatory Option: device
    if (options["device"]) {
      this.device = options["device"] as ProxonNS.DeviceType;
    } else {
      throw new Error("Missing Device definition");
    }
    //Optional: Results from a Modbus reading
    if (options["result"]) this.result = options.result;
    else this.result = {} as ProxonNS.Results;

    //Optional: Register definitions of the device
    if (options["registers"]) this.registers = options.registers;
    else this.registers = [];
  }

  /**
   * Calcalutes the value of a Custom Register. The instance of TempPanelRegister
   * has to be created with options: device, result
   * 
   * @param register Custom Register to calculate
   * @returns Value of the Custom Register
   */
  getRegisterValue(register: ProxonNS.Register): number {
    let ofsType: number, ofsReg: number, midType: number, midReg: number;
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
    if (!(ofsType && ofsReg && midType && midReg))
      throw new Error("Parameter incomplete");

    //Get middle temperature
    tempS = this.result.find((elem) => {
      if (
        elem.device === this.device &&
        elem.type === midType &&
        elem.register === midReg
      )
        return true;
    })?.value;
    if (tempS) {
      midTemp = Number.parseInt(tempS);
    }
    //Get offset temperature
    tempS = this.result.find((elem) => {
      if (
        elem.device === this.device &&
        elem.type === ofsType &&
        elem.register === ofsReg
      )
        return true;
    })?.value;
    if (tempS) {
      ofsTemp = Number.parseInt(tempS);
    }

    //Return sum of middle and offset temperature
    return midTemp + ofsTemp;
  }

  /**
   * Transforms the Custom Register and value to the assigned Modbus
   * Registers, which need to updated on the device. The instance of
   * TempPanelRegister has to be created with options: device, registers
   * 
   * @param register The Custom Register that was updated
   * @param value Value of the Custom Register
   */
  getInputRegisters(
    register: ProxonNS.Register,
    value: number
  ): ProxonNS.Inputs {
    let ofsType: number, ofsReg: number, midType: number, midReg: number;
    let midTemp = 0;
    let ofsTemp = 0;
    let temp;

    //First transform supplied parameters
    try {
      ofsType = register.options["offset"]["type"];
      ofsReg = register.options["offset"]["register"];
      midType = register.options["middle"]["type"];
      midReg = register.options["middle"]["register"];
    } catch (error) {
      throw error;
    }
    if (!(ofsType && ofsReg && midType && midReg))
      throw new Error("Parameter incomplete");
    
    //Get Offset Register and value
    const ofsRegister = ProxonTools.findRegister(this.registers,ofsType, ofsReg);
    ofsTemp = this.getValueFromResult(ofsType, ofsReg);
    //Use Minimum and Maximum for Offset from Configuration, else +-3 
    const ofsMax = ofsRegister?.max?ofsRegister.max:3;
    const ofsMin = ofsRegister?.min?ofsRegister.min:-3;
    if (!ofsRegister) return [];

    //Get Middle Register and value
    const midRegister = ProxonTools.findRegister(this.registers,midType, midReg);
    midTemp = this.getValueFromResult(midType, midReg);
    if (!midRegister) return [];

    //Calculate correct values for Middle and Offset to match value passed in 
    temp = midTemp + ofsTemp;
    while(temp!=value){
      if (temp<value){
        //Need to increase. First offset then middle.
        if (ofsTemp<ofsMax) ofsTemp++; else midTemp++;
      }else{
        //Need to decrease. First Offset then middle.
        if (ofsTemp>ofsMin) ofsTemp--; else midTemp--;
      }
      temp = midTemp + ofsTemp;
    }

    //Return the calculated values for Middle and Offset. 
    return [
      { register: midRegister, value: midTemp },
      { register: ofsRegister, value: ofsTemp }
    ];
  }

  /**
   * Get the current value for the Register from class data.
   * 
   * @param type Modbus Register Type
   * @param number Modbus Register Id
   * @returns 
   */
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
