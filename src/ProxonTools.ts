import { ReadRegisterResult } from "@modbus";
import { readFile } from "fs/promises";

export namespace ProxonNS {
  export enum DeviceType {
    PROXON = "proxon",
    T300 = "t300",
  }
  // export enum Params {
  //   PROXON = "proxon",
  //   T300 = "t300",
  //   GROUPS = "groups",
  // }
  export enum RegisterType {
    HOLDING = 1,
    INPUT = 2,
    CUSTOM = 3,
  }
  export interface Register {
    type: RegisterType;
    register: number;
    description: string;
    write: boolean;
    data: string;
    min: number;
    max: number;
    scaling: number;
    offset?: number;
    unit: string;
    class?: string;
    options?: any;
  }
  export interface Registers extends Array<Register> {}

  export interface Result {
    device: DeviceType;
    type: number;
    register: number;
    description: string;
    value: string;
    unit: string;
  }
  export interface Results extends Array<Result> {}
}

export class ProxonTools {
  /**
   * Read Proxon Register configuration from the supplied file.
   *
   * @param path File path
   * @returns Proxon Registers from the file as JSON Object
   */
  public static async loadConfigFromFile(
    path: string
  ): Promise<ProxonNS.Registers> {
    //Read configuration from file
    const file = await readFile(path, { encoding: "utf-8" });
    if (!file) throw new Error(`Error reading file at: ${path}`);

    return JSON.parse(file) as ProxonNS.Registers;
  }

  /**
   * Service method to retrieve a Register by Type and Number.
   * @param registers Proxon.Registers to search for the supplied type and register
   * @param type Number defining the register type. 1 = Holding, 2 = Input
   * @param register Number of the register
   * @returns Found Proxon.Register or NULL
   */
  static findRegister(
    registers: ProxonNS.Registers,
    type: number,
    register: number
  ): ProxonNS.Register | null {
    let reg: ProxonNS.Register | undefined | null;
    reg = registers.find((item) => {
      if (item.type == type && item.register == register) return item;
    });
    if (!reg) reg = null;
    return reg;
  }

  /**
   * Transforms supplied value to Modbus format.
   * 
   * @param register Single Proxon.Register with configuration data filled
   * @param value Value in external representation
   * @returns Value in internal representation
   */
  static validateInput(register: ProxonNS.Register, value: any): number {
    let internal: number;

    //Do scaling according to configuration
    internal = value * register.scaling;
    //For signed numbers add sign
    if (register.data == "int16") internal = this.convertToInt16(internal);
    return internal;
  }

  /**
   * Transforms Modbus Register reading to the internal result structure.
   * 
   * @param data
   * @returns
   */
  public static handleResult(
    data: ReadRegisterResult,
    config: ProxonNS.Register,
    device: ProxonNS.DeviceType
  ): ProxonNS.Result {
    let result: ProxonNS.Result;
    let value;
    if (data) {
      result = {
        device: device,
        type: config.type,
        register: config.register,
        description: config.description,
        value: "",
        unit: config.unit,
      };

      value = data.data[0];
      if (config.data == "int16") {
        value = ProxonTools.convertFromInt16(value);
        // value = value - 0x10000;
      }
      if (config.offset) value += config.offset;
      value = value / config.scaling;
      result.value = value.toString();
    } else {
      result = {} as ProxonNS.Result;
    }
    return result;
  }

  static convertFromInt16(i: number): number {
    let int16 = new Int16Array(1);
    int16[0] = i;
    return int16[0];
  }

  static convertToInt16(i: number): number {
    let internal: number;
    internal = i;
    if (i < 0) {
      internal = internal + 0x10000;
    }
    return internal;
  }
}
