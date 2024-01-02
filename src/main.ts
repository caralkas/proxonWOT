import {
  Property,
  MultipleThings,
  Thing,
  Value,
  WebThingServer,
  SingleThing,
} from "webthing";
import { ProxonNS } from "./ProxonTools";
import { Proxon } from "./Proxon";

class Main {
  private server:Proxon;
  
  /**
   * Create and initialize the Proxon Server Instance with commandline parameters
   */
  constructor() {       
    this.server = new Proxon();
    for (let i = 2; i < process.argv.length; i++) {
      let param = process.argv[i].split("=");
      //Only respect known Name/Value pairs to set variable values for Port and Config files
      if (param.length != 2) continue;
      switch (param[0].toLowerCase()) {
        case ProxonNS.DeviceType.PROXON:
          this.server.setConfig(ProxonNS.DeviceType.PROXON, param[1]);
          break;
        case ProxonNS.DeviceType.T300:
          this.server.setConfig(ProxonNS.DeviceType.T300, param[1]);
          break;
        case 'port':
          this.server.setPort(parseInt(param[1]))
          break;      
      }
    }    
  }

  public async run(): Promise<void> {
    await this.server.start();
  }
}

new Main().run();
