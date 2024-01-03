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
   * @param device Short name of the WebThing
   * @param description Description for the WebThing
   * @param config Proxon Registers that should be available as Properties on the WebThing
   * @param valueForwarder Callback function for value changes with signature (name,value)
   * @param regMatcher Register Matcher instance
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
        valueForwarder(
          ProxonTools.convertRegToId({
            device: nameL,
            type: reg.type,
            register: reg.register,
          } as ProxonNS.RegisterId),
          value
        );
        // valueForwarder(`${nameL}-${reg.type}-${reg.register}`, value);
      });
      //Fill the Utiltity Class for direct Value access. We need this to bypass
      //"readOnly" flag on Property for automatic update via ModBus
      regMatcher.addMapping(device, reg.type, reg.register, val);

      newThing.addProperty(
        new Property(
          newThing,
          `${ProxonTools.convertRegToId({
            device: nameL,
            type: reg.type,
            register: reg.register,
          } as ProxonNS.RegisterId)}`,
          val,
          {
            "@type": "LevelProperty",
            title: reg.description,
            type: "number",
            description: reg.description,
            minimum: (reg.min / reg.scaling) * 1.0,
            maximum: (reg.max / reg.scaling) * 1.0,
            unit: reg.unit,
            readOnly: !reg.write,
          }
        )
      );
    }

    return newThing;
  }

  /**
   * Create a new WebThing that has all Registers from the file in path as Properties.
   * The valueForwarder is called whenever a Property value is changed.
   *
   * @param device Short name of the WebThing
   * @param description Description for the WebThing
   * @param path Path to a file that contains a Proxon Registers definition in JSON format
   * @param valueForwarder Callback function for value changes with signature (name,value)
   * @param regMatcher Register Matcher instance
   * @returns The WebThing with Properties
   */
  public static async buildFromFile(
    device: ProxonNS.DeviceType,
    description: string,
    path: string,
    valueForwarder: Function,
    regMatcher: RegisterValueMatcher
  ): Promise<Thing> {
    const config = await ProxonTools.loadConfigFromFile(path);
    return this.buildFromConfig(
      device,
      description,
      config,
      valueForwarder,
      regMatcher
    );
  }
}
