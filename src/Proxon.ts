import { MultipleThings, Thing, WebThingServer } from "webthing";
import { ProxonNS, ProxonTools } from "./ProxonTools";
import { ThingBuilder } from "./ThingBuilder";
import { Queue } from "./Queue";
import { ProxonProxy } from "./ProxonProxy";

export class Proxon {
  private static updateInterval: number = 5000;
  private static usbCon:string = "/dev/ttyUSB0";
  private server: WebThingServer | null;
  private port: number;
  private pathProxon: string = "./assets/proxon-registers.json";
  private pathT300: string = "./assets/t300-registers.json";
  private queue:Queue;
  private proxonProxy: ProxonProxy;

  constructor(port: number=8888) {
    this.port = port;
    this.server = null;
    this.queue = new Queue();
    this.proxonProxy = new ProxonProxy(this.queue, Proxon.usbCon);
  }

  /**
   * Setter for WebServer Port.
   *
   * @param port Port for the WebServer
   */
  public setPort(port: number) {
    this.port = port;
  }

  public setConfig(type: ProxonNS.DeviceType, path: string): void {
    switch (type) {
      case ProxonNS.DeviceType.T300:
        this.pathT300 = path;
        break;
      case ProxonNS.DeviceType.PROXON:
        this.pathProxon = path;
        break;
    }
  }

  /**
   * Load Configuration from files and start the server
   */
  public async start() {
    let thing: Thing;
    const mulThings: Array<Thing> = new Array();

    //Load Configuration
    this.proxonProxy.setConfig(ProxonNS.DeviceType.PROXON, await ProxonTools.loadConfigFromFile(this.pathProxon));
    this.proxonProxy.setConfig(ProxonNS.DeviceType.T300, await ProxonTools.loadConfigFromFile(this.pathT300));

    //Build WebThings
    try {
      //Proxon
      thing = await ThingBuilder.buildFromConfig(
        ProxonNS.DeviceType.PROXON,
        "Proxon FWT",
        this.proxonProxy.getConfig(ProxonNS.DeviceType.PROXON),
        this.proxonProxy.handleValueChange.bind(this),
        this.proxonProxy.getRegMatcher()
      );
      mulThings.push(thing);
      //T300
      thing = await ThingBuilder.buildFromConfig(
        ProxonNS.DeviceType.T300,
        "Proxon T300",
        this.proxonProxy.getConfig(ProxonNS.DeviceType.T300),
        this.proxonProxy.handleValueChange,
        this.proxonProxy.getRegMatcher()
      );
      mulThings.push(thing);
    } catch (error) {
      console.error(error);
    }

    //Start Server
    this.server = new WebThingServer(
      new MultipleThings(mulThings, "Proxon WOT"), this.port
    );
    this.server
      .start()
      .then(
        this.handleServerRunning.bind(this),
        this.handleServerError.bind(this)
      )
      .catch(this.handleServerError.bind(this));

    this.startModbusPolling();        
  }

  /**
   * Stop the server
   */
  public stop() {
    this.server?.stop(true);
  }

  /**
   * Polls data from Modbus in the interval defined by Proxon.updateInterval.
   * 
   */
  public startModbusPolling(){ 
    this.queue.enqueue(()=>new Promise(
      async (resolve,reject)=>{   
        //Process the Updated
        await this.proxonProxy.valueUpdater();
        //Schedule next Update in Proxon.updateInterval Milliseconds      
        setTimeout(()=>{this.startModbusPolling()},Proxon.updateInterval);         
        resolve(true);                          
      }
    ))     
  }
  
  private handleServerRunning() {
    console.info(`Server running on port ${this.port}`);
  }

  private handleServerError(error: any) {
    console.error(error);
  }
}