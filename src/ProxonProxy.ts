import GetDataModbus from "./GetDataModbus";
import { ProxonNS, ProxonTools } from "./ProxonTools";
import { Queue } from "./Queue";
import { RegisterValueMatcher } from "./RegisterValueMatcher";
import { SetDataModbus } from "./SetDataModbus";
import { RegisterProvider } from "./customRegisters/RegisterProvider";

export class ProxonProxy {
  // private iUpdate: boolean = false;
  private configProxon: ProxonNS.Registers;
  private configProxonM: ProxonNS.Registers;
  private configProxonC: ProxonNS.Registers;
  private configT300: ProxonNS.Registers;
  private regMatcher: RegisterValueMatcher;
  private queue: Queue;
  private usbCon: string;
  private lastReading: ProxonNS.Results;

  constructor(queue: Queue, usbCon: string = "/dev/ttyUSB0") {
    this.configProxon = [];
    this.configProxonC = [];
    this.configProxonM = [];
    this.configT300 = [];
    this.regMatcher = new RegisterValueMatcher();
    this.queue = queue;
    this.usbCon = usbCon;
    this.lastReading = [];

    //Always bind below functions to their respective instance
    this.handleValueChange = this.handleValueChange.bind(this);
  }

  /**
   * Set the Configuration to use for the specified Device.
   *
   * @param type Device Type of the Registers
   * @param config Register Definition to use
   */
  public setConfig(
    type: ProxonNS.DeviceType,
    config: ProxonNS.Registers
  ): void {
    switch (type) {
      case ProxonNS.DeviceType.T300:
        this.configT300 = config;
        break;
      case ProxonNS.DeviceType.PROXON:
        this.configProxon = config;
        for (const elem of this.configProxon) {
          if (elem.type === ProxonNS.RegisterType.CUSTOM) {
            this.configProxonC.push(elem);
          } else {
            this.configProxonM.push(elem);
          }
        }
        break;
    }
  }

  /**
   * Returns the current Configuration for a Device.
   *
   * @param type Device Type
   * @returns
   */
  public getConfig(type: ProxonNS.DeviceType): ProxonNS.Registers {
    switch (type) {
      case ProxonNS.DeviceType.T300:
        return this.configT300;
        break;
      case ProxonNS.DeviceType.PROXON:
        return this.configProxon;
        break;
    }
  }

  /**
   * Returns the current Register to Value matcher. The entries in the Matcher are created in the ThingBuilder.
   *
   * @returns Register->Value Matcher
   */
  public getRegMatcher(): RegisterValueMatcher {
    return this.regMatcher;
  }

  /**
   * Retrieves all Modbus Registers from the Proxon. All remaining "Custom" Registers are calculated
   * according to the speciefied class.
   *
   */
  public async valueUpdater() {
    console.log("Update!");

    //Get current data from Proxon FWT via Modbus
    this.lastReading = await new GetDataModbus(
      this.configProxonM,
      ProxonNS.DeviceType.PROXON,
      this.usbCon
    ).runRetry(10, 100);

    //Calculate Custom values
    for (const elem of this.configProxonC) {
      let value = 0;
      let custReg = {} as ProxonNS.Result;
      if (elem.class) {
        //Delegate call to specific Register class given in configuration
        custReg.value = `${RegisterProvider.getProvider(elem.class, {
          result: this.lastReading,
          device: ProxonNS.DeviceType.PROXON,
        }).getRegisterValue(elem)}`;
        custReg.device = ProxonNS.DeviceType.PROXON;
        custReg.description = elem.description;
        custReg.register = elem.register;
        custReg.type = elem.type;
        custReg.unit = elem.unit;
        this.lastReading.push(custReg);
      }
    }

    //Get current data from Proxon T300 via Modbus
    const resultT300 = await new GetDataModbus(
      this.configT300,
      ProxonNS.DeviceType.T300,
      this.usbCon
    ).runRetry(10, 100);

    this.lastReading.push(...resultT300);

    //Set result to WebThing Properties
    for (let reg of this.lastReading) {
      let value = Number.parseFloat(reg.value);
      if (value % 1 == 0) value = Number.parseInt(reg.value); //Try to use Integer when possible

      try {
        const vals = this.regMatcher.getMapping(
          reg.device,
          reg.type,
          reg.register
        );
        for (const val of vals) {
          val.notifyOfExternalUpdate(value); //Call bypasses validation and ValueForwarder function
        }
      } catch (error) {
        console.log(
          `Error setting (${ProxonTools.convertRegToId({
            device: reg.device,
            type: reg.type,
            register: reg.register,
          } as ProxonNS.RegisterId)}): ${value}`
        );
      }
    }  
  }

  /**
   * Handle value changes to any of the Proxon Registers through the Webservice.
   *
   * @param register
   * @param value
   */
  public async handleValueChange(register: string, value: any) {
    console.log(`Neuer Wert ${register}: ${value}`);

    let regsToUpdate: ProxonNS.Inputs = [];
    let regToUpdate: ProxonNS.Register | undefined;

    //Make sure there happened at least one reading of Modbus before any update
    if (!this.lastReading) await this.valueUpdater();

    //Find correct Register for Id
    const regId = ProxonTools.convertIdToReg(register);
    const registers =
      regId.device === ProxonNS.DeviceType.PROXON
        ? this.configProxon
        : this.configT300;
    regToUpdate = registers.find((elem) => {
      if (elem.type === regId.type && elem.register === regId.register)
        return true;
    });
    
    //No valid Register definition
    if (!regToUpdate) return;

    //Get Modbus Registers for update
    if (regId.type === ProxonNS.RegisterType.CUSTOM && regToUpdate.class) {
      //Custom Register needs to be mapped to its Modus registers
      regsToUpdate = RegisterProvider.getProvider(regToUpdate.class, {
        device: regId.device,
        registers: registers,
        result: this.lastReading
      }).getInputRegisters(regToUpdate, value);
    } else {
      //Normal Register can directly be added to update Array
      regsToUpdate.push({ register: regToUpdate, value: value });
    }

    //No valid Registers to update
    if (regsToUpdate.length === 0) return;

    //Queue update of the Modbus Register
    this.queue.enqueue(
      () =>
        new Promise(async (resolve, reject) => {
          //Process the Updated
          await new SetDataModbus(
            regsToUpdate,
            regId.device,
            this.usbCon
          ).runRetry();
          resolve(true);
        })
    );
  }
}
