import GetDataModbus from "./GetDataModbus";
import { ProxonNS } from "./ProxonTools";
import { RegisterValueMatcher } from "./RegisterValueMatcher";

export class ProxonProxy {
  private iUpdate: boolean = false;
  private configProxon: ProxonNS.Registers;
  private configT300: ProxonNS.Registers;
  private regMatcher: RegisterValueMatcher;

  constructor(){
    this.configProxon = [];
    this.configT300 = [];
    this.regMatcher = new RegisterValueMatcher();
  }

  public setConfig(type: ProxonNS.DeviceType, config: ProxonNS.Registers): void {
    switch (type) {
      case ProxonNS.DeviceType.T300:
        this.configT300 = config;
        break;
      case ProxonNS.DeviceType.PROXON:
        this.configProxon = config;
        break;
    }
  }

  public getConfig(type: ProxonNS.DeviceType): ProxonNS.Registers{
    switch (type) {
      case ProxonNS.DeviceType.T300:
        return this.configT300;
        break;
      case ProxonNS.DeviceType.PROXON:
        return this.configProxon;
        break;
    }
    throw new Error("Error");    
  }

  public getRegMatcher():RegisterValueMatcher{
    return this.regMatcher;
  }

  public async valueUpdater() {
    if (!this.configProxon) return;

    console.log("Update!");
    this.iUpdate = true;

    //Get current data from Modbus device
    const result = await new GetDataModbus(
      this.configProxon,
      ProxonNS.DeviceType.PROXON,
      "/dev/ttyUSB0"
    ).runRetry(10, 100);

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

    this.iUpdate = false;
  }

  /**
   * Handle value changes to any of the Proxon Registers through the Webservice.
   *
   * @param register
   * @param value
   */
  public handleValueChange(register: string, value: any) {
    if (this.iUpdate) return;
    console.log(`Neuer Wert ${register}: ${value}`);
  }
}
