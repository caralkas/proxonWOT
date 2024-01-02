import GetDataModbus from "./GetDataModbus";
import { ProxonNS } from "./ProxonTools";
import { Queue } from "./Queue";
import { RegisterValueMatcher } from "./RegisterValueMatcher";

export class ProxonProxy {
  // private iUpdate: boolean = false;
  private configProxon: ProxonNS.Registers;
  private configProxonM: ProxonNS.Registers;
  private configProxonC: ProxonNS.Registers;
  private configT300: ProxonNS.Registers;
  private regMatcher: RegisterValueMatcher;
  private queue:Queue;

  constructor(queue:Queue){
    this.configProxon = this.configProxonC = this.configProxonM = [];
    this.configT300 = [];
    this.regMatcher = new RegisterValueMatcher();
    this.queue = queue; 
  }

  /**
   * Set the Configuration to use for the specified Device.
   * 
   * @param type Device Type of the Registers
   * @param config Register Definition to use
   */
  public setConfig(type: ProxonNS.DeviceType, config: ProxonNS.Registers): void {
    switch (type) {
      case ProxonNS.DeviceType.T300:
        this.configT300 = config;        
        break;
      case ProxonNS.DeviceType.PROXON:
        this.configProxon = config;
        for (const elem of this.configProxon){
          if (elem.type===ProxonNS.RegisterType.CUSTOM){
            this.configProxonC.push(elem);
          }else{
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
  public getConfig(type: ProxonNS.DeviceType): ProxonNS.Registers{
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
  public getRegMatcher():RegisterValueMatcher{
    return this.regMatcher;
  }

  /**
   * Retrieves all Modbus Registers from the Proxon. All remaining "Custom" Registers are calculated 
   * according to the speciefied class.
   * 
   */
  public async valueUpdater(){
    if (!this.configProxon) return;

    console.log("Update!");
    // this.iUpdate = true;

    //Get current data from Modbus device
    const result = await new GetDataModbus(
      this.configProxonM,
      ProxonNS.DeviceType.PROXON,
      "/dev/ttyUSB0"
    ).runRetry(10, 100);

    
    //Calculate Custom values
    //TODO

    //Set result to WebThing Properties
    for (let reg of result) {
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
          `Error setting (${reg.device}-${reg.type}-${reg.register}): ${value}`
        );
      }
    }

    // this.iUpdate = false;
  }

  /**
   * Handle value changes to any of the Proxon Registers through the Webservice.
   *
   * @param register
   * @param value
   */
  public handleValueChange(register: string, value: any) {
    // if (this.iUpdate) return;
    console.log(`Neuer Wert ${register}: ${value}`);
  }
}
