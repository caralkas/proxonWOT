import { readFile } from "fs";
import { promisify } from "util";
import { Property, Thing, Value } from "webthing";
import { ProxonNS, ProxonTools } from "./ProxonTools";
import { RegisterValueMatcher } from "./RegisterValueMatcher";

export class ThingBuilder {
  private static readFileAsync = promisify(readFile);

  /**
   * Create a new WebThing that has all Registers supplied in config as Properties.
   * The valueForwarder is called whenever a Property value is changed.
   * 
   * @param name Short name of the WebThing
   * @param description Description for the WebThing
   * @param config Proxon Registers that should be available as Properties on the WebThing
   * @param valueForwarder Callback function for value changes with signature (name,value)
   * @returns The WebThing with Properties
   */
  public static buildFromConfig(
    device: ProxonNS.DeviceType,
    description: string,
    config: ProxonNS.Registers,
    valueForwarder: Function,
    regMatcher: RegisterValueMatcher
  ): Thing {
    const nameL = device.toLowerCase().replace(/\s+/g, "");

    //Create Thing stub
    const newThing = new Thing(
      `urn:dev:ops:${nameL}`,
      description.replace(/\s+/g, ""),
      ["Heater"],
      description
    );

    //Add all Registers from the configuration as Properties
    for (const reg of config) {
      const val = new Value(reg.min / reg.scaling, (value) => {
        valueForwarder(`${nameL}-${reg.type}-${reg.register}`, value);
      });
      //Fill the Utiltity Class for direct Value access. We need this to bypass 
      //"readOnly" flag on Property for automatic update via ModBus
      regMatcher.addMapping(device,reg.type,reg.register,val);

      newThing.addProperty(
        new Property(
          newThing,
          `${nameL}-${reg.type}-${reg.register}`,
          val,
          {
            "@type": "LevelProperty",
            title: reg.description,
            type: "number",
            description: reg.description,
            minimum: reg.min / reg.scaling * 1.0,
            maximum: reg.max / reg.scaling * 1.0,
            unit: reg.unit,
            readOnly: !reg.write,
          }
        )
      );
    }

    return newThing;
  }

  public static async buildFromFile(
    device: ProxonNS.DeviceType,
    description: string,
    path: string,
    valueForwarder: Function,
    regMatcher: RegisterValueMatcher
  ): Promise<Thing> {
    
    
    //Read configuration from file
    // const file = await ThingBuilder.readFileAsync(path, { encoding: "utf-8" });
    // if (!file) throw new Error(`Error reading file at: ${path}`);
    // const config: ProxonNS.Registers = JSON.parse(file);

    const config = await ProxonTools.loadConfigFromFile(path);

    return this.buildFromConfig(device, description, config, valueForwarder, regMatcher);

    // //Create Thing stub
    // const newThing = new Thing(
    //   `urn:dev:ops:${nameL}`,
    //   description.replace(/\s+/g, ""),
    //   ["Heater"],
    //   description
    // );

    // //Add all Registers from the configuration as Properties
    // for (const reg of config) {
    //   newThing.addProperty(
    //     new Property(
    //       newThing,
    //       `${nameL}-${reg.type}-${reg.register}`,
    //       new Value(reg.min/reg.scaling, (value)=>{valueForwarder(`${nameL}-${reg.type}-${reg.register}`,value)}),
    //       {
    //         "@type": "LevelProperty",
    //         title: reg.description,
    //         type: "integer",
    //         description: reg.description,
    //         minimum: reg.min/reg.scaling,
    //         maximum: reg.max/reg.scaling,
    //         unit: reg.unit,
    //         readOnly: !reg.write,
    //       }
    //     )
    //   );
    // }

    // return newThing;
  }
}
