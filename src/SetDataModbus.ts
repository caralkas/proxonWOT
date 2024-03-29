// import { ModbusRTU, WriteRegisterResult } from "modbus-serial/ModbusRTU";
import ModbusRTU from "modbus-serial";
import { WriteRegisterResult } from "../node_modules/modbus-serial/ModbusRTU";
import { ProxonTools, ProxonNS } from "./ProxonTools";
// import { Proxon } from "./ProxonTypes";
// import {
//   IRegisterProvider,
//   RegisterProvider,
// } from "./register/RegisterProvider";

/**
 * Class to change
 */
export class SetDataModbus {
  private client: ModbusRTU;
  private registers: ProxonNS.Inputs;
  private device: ProxonNS.DeviceType;
  private usbCon: string;

  constructor(
    registers: ProxonNS.Inputs,
    device: ProxonNS.DeviceType,
    usbConnection: string
  ) {
    this.registers = registers;
    this.client = new ModbusRTU();
    this.client.setID(41);
    this.device = device;
    this.usbCon = usbConnection;
  }

  async run(): Promise<void> {
    let result: WriteRegisterResult;
    let value: number;
    let input: ProxonNS.Input;

    //Try to open Connection
    try {
      await this.client.connectRTUBuffered(this.usbCon, {
        baudRate: 19200,
        dataBits: 8,
        stopBits: 1,
        parity: "even",
      });
    } catch (error) {
      //Open failed. Return rejection as Promise.
      return new Promise((resolve, reject) => {
        reject("Modbus error");
      });
    }

    //Write all values
    for (let a = 0; a < this.registers.length; a++) {
      input = this.registers[a];
      //Make sure register is really writeable
      if (!input.register.write)
        throw new Error(
          `Write not supported for Register: ${input.register.description} (${input.register.type},${input.register.register})`
        );
      //Validate value
      value = ProxonTools.validateInput(input.register, input.value);
      //Write value
      result = await this.client.writeRegister(input.register.register, value);
    }

    //Close Connection
    this.client.close((test: any) => {});
  }

  async runRetry(times: number=3, delay: number=100): Promise<void> {
    const retriesMax = times > 0 ? times : 1; //At least one try
    const interval = delay > 100 ? delay : 100; //At least 100 ms delay

    //Try retriesMax times with interval delays
    for (let i = 0; i < retriesMax; i++) {
      try {
        return await this.run();
      } catch {
        //Wait interval seconds if maximum retries not reached
        if (i + 1 < retriesMax) {
          await new Promise((resolve, reject) => {
            setTimeout(resolve, interval);
          });
        }
      }
    }

    //All tries used --> Return with error
    return new Promise((resolve, reject) => {
      reject({ type: 1 });
    });
  }
}
