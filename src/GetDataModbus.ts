// import ModbusRTU from 'modbus-serial';
import ModbusRTU from "modbus-serial";
// import ModbusRTU from '@modbus';
import { ReadRegisterResult } from "@modbus";
// import { ModbusRTU, ReadRegisterResult } from '@modbus';
// import { ReadRegisterResult } from '@modbus/ModbusRTU'
// const test = require('../node_modules/modbus-serial/apis/connection.js');
import { ProxonNS, ProxonTools } from "./ProxonTools";
// import { DeviceType, ProxonTools, RegisterType } from "./ProxonTools";
// const ModbusRTU = require('modbus-serial')

export default class GetDataModbus {
  private client: ModbusRTU;
  private registers: ProxonNS.Registers;
  private device: ProxonNS.DeviceType;
  private usbCon: string;

  constructor(
    registersGet: ProxonNS.Registers,
    device: ProxonNS.DeviceType,
    usbConnection: string
  ) {
    this.client = new ModbusRTU();
    this.client.setID(41);
    this.registers = registersGet;
    this.device = device;
    this.usbCon = usbConnection;
  }

  /**
   * Read result values via Modbus from the system
   * @returns
   */
  async run(): Promise<ProxonNS.Results> {
    //Sort Registers by Type and Register Number
    this.registers.sort((a, b) => {
      if (a.type < b.type) {
        return -1;
      } else if (a.type > b.type) {
        return 1;
      } else {
        //Matching types - Check Register number
        if (a.register < b.register) {
          return -1;
        } else if (a.register > b.register) {
          return 1;
        } else {
          return 0;
        }
      }
    });

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

    //Execute packed requested of Registers to reduce number of Modbus calls
    let count = 0;
    let regStart = 0;
    let regLength = 0;
    let regType = 0;
    let result;
    let request = new Array(0);
    let singleResult: ReadRegisterResult = {
      buffer: Buffer.from([]) as Buffer,
      data: [],
    };
    let pResults = new Array<ProxonNS.Result>(0);

    for (const el of this.registers) {
      if (request.length === 0) {
        //On empty array start new request
        regType = el.type;
        regStart = el.register;
        regLength = 1;
        request.push(el);
      } else {
        //If it is the same type add register to request
        if (
          regType === el.type &&
          regStart + regLength == el.register &&
          regLength < 20
        ) {
          regLength++;
          request.push(el);
        } else {
          //Execute current request
          try {
            result = await this.readRegister(regType, regStart, regLength);
          } catch (error) {
            result = undefined;
          }
          if (result) {
            //Map result to Registers in 'request'
            for (const el of result.data) {
              singleResult.data = [el];
              pResults.push(
                ProxonTools.handleResult(
                  singleResult,
                  request.shift(),
                  this.device
                )
              );
            }
            result = undefined;
          }

          //Start new request
          result = undefined;
          regType = el.type;
          regStart = el.register;
          regLength = 1;
          request = [el];
        }
      }
    }
    //Execute last request if required
    if (request.length > 0) {
      try {
        result = await this.readRegister(regType, regStart, regLength);
      } catch (error) {
        result = undefined;
      }
      if (result) {
        //Map result to Registers in 'request'
        for (const el of result.data) {
          singleResult.data = [el];
          pResults.push(
            ProxonTools.handleResult(singleResult, request.shift(), this.device)
          );
        }
        result = undefined;
      }
    }

    //Close Connection
    this.client.close(() => {});
    return pResults;
  }

  /**
   * Execute the Register retrieval with "times" number of retries waiting
   * "delay" Miliseconds between each.
   * 
   * @param times Number of retries to read a register before error
   * @param delay Time in Miliseconds between tries
   * @returns 
   */
  public async runRetry(times: number, delay: number): Promise<ProxonNS.Results> {
    const retriesMax = times > 0 ? times : 1; //At least one try
    const interval = delay > 100 ? delay : 100; //At least 100 ms delay

    //Try retriesMax times with interval delays
    for (let i = 0; i < retriesMax; i++) {
      try {
        return await this.run();
      } catch {
        //Wait interval seconds if maximum retries not reached
        if (i+1 < retriesMax) {
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

  /**
   * Read the supplied Registers
   *
   * @param type Register Type of ProxonTools.RegisterType
   * @param start Index of the Register to start access from
   * @param length Number of Registers to read
   * @returns Promise of ReadRegisterResult
   */
  private async readRegister(
    type: number,
    start: number,
    length: number
  ): Promise<ReadRegisterResult> {
    let read;
    let result: ReadRegisterResult;
    try {
      switch (type) {
        case ProxonNS.RegisterType.INPUT:
          return await this.client.readInputRegisters(start, length);
        case ProxonNS.RegisterType.HOLDING:
          return await this.client.readHoldingRegisters(start, length);
        default:
          //Dummy Promise that always rejects
          return new Promise((resolve, reject) => {
            reject("No valid Register Type");
          });
      }
    } catch (error) {
      //Error while reading package. Try single access
      result = {
        buffer: Buffer.from([]),
        data: [],
      };
      //Read from Modbus
      for (let i = start; i < start + length; i++) {
        switch (type) {
          case ProxonNS.RegisterType.INPUT:
            read = await this.client.readInputRegisters(i, 1);
            break;
          case ProxonNS.RegisterType.HOLDING:
            read = await this.client.readHoldingRegisters(i, 1);
            break;
          default:
            //Dummy Promise that always rejects
            read = result;
            break;
        }
        result.buffer = Buffer.concat([result.buffer, read.buffer]);
        result.data.push(read.data[0]);
      }
      //Return data as Promise that always resolves
      return new Promise((resolve, reject) => {
        resolve(result);
      });
    }
  }
}
