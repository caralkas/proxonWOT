import { Property, MultipleThings, Thing, Value, WebThingServer, SingleThing } from "webthing";
class Main{
    server: WebThingServer|null;    
    constructor(){
        this.server = null;

        
    }

    public run():void{        
        console.info("Setup...");        
        this.server=new WebThingServer(this.buildThings(),8888);
        
        //Register Handler for killed Process
        // process.on('SIGINT',this.killServer.bind(this));

        //Start Server        
        this.server.start().catch(console.error);
        console.log("Running...");
    }

    /**
     * Create all Things including Properties.
     *    
     * @returns Initialized MultipleThings Object.
     */
    private buildThings():MultipleThings{
        let things:Array<Thing> = [];

        //Create Thing
        const proxonFWT = new Thing( 
            'urn:dev:ops:proxonfwt',
            'ProxonFWT',
            ['Heater'],
            'Proxon Frischluft Wärmetechnik'
        );

        //Add Properties
        proxonFWT.addProperty(new Property(
            proxonFWT,
            'TemperaturZone1',
            new Value(20,(value)=>{console.log('Temperatur ist jetzt',value)}),
            {
                '@type': 'LevelProperty',
                title: 'TemperatureZone1',
                type: 'integer',
                description: 'Aktuelle Temperatur in °C',
                minimum: 0,
                maximum: 100,
                unit: '°C',
                readOnly: false,                
            }
        ));
        proxonFWT.addProperty(new Property(
            proxonFWT,
            'TemperaturZone2',
            new Value(20,(value)=>{console.log('Temperatur ist jetzt',value)}),
            {
                '@type': 'LevelProperty',
                title: 'Temperatur Zone 2',
                type: 'integer',
                description: 'Aktuelle Temperatur in °C',
                minimum: 0,
                maximum: 100,
                unit: '°C',
                readOnly: false,                
            }
        ));
        proxonFWT.addProperty(new Property(
            proxonFWT,
            'TemperaturZone3',
            new Value(20,(value)=>{console.log('Temperatur ist jetzt',value)}),
            {
                '@type': 'LevelProperty',
                title: 'Temperatur Zone 3',
                type: 'integer',
                description: 'Aktuelle Temperatur in °C',
                minimum: 0,
                maximum: 100,
                unit: '°C',
                readOnly: false,                
            }
        ));
        things.push(proxonFWT);

        //Create T300
        const proxonT300 = new Thing( 
            'urn:dev:ops:proxont300',
            'ProxonT300',
            ['Heater'],
            'Proxon T300'
        );
        //Add Properties
        proxonT300.addProperty(new Property(
            proxonT300,
            'WaterTemperature',
            new Value(20,(value)=>{console.log('Temperatur ist jetzt',value)}),
            {
                '@type': 'LevelProperty',
                title: 'Wassertemperatur',
                type: 'integer',
                description: 'Aktuelle Temperatur in °C',
                minimum: 0,
                maximum: 100,
                unit: '°C',
                readOnly: false,                
            }
        ));
        things.push(proxonT300);

        //Return all things
        return new MultipleThings(things,"Proxon Interface");
    }

    private buildThing():SingleThing{
        //Create Thing
        const thing = new Thing( 
            'urn:dev:ops:proxon',
            'ProxonFWT',
            ['Heater'],
            'Proxon Frischluft Wärmetechnik'
        );

        //Add Properties
        thing.addProperty(new Property(
            thing,
            'TemperaturZone1',
            new Value(20,(value)=>{console.log('Temperatur ist jetzt',value)}),
            {
                '@type': 'LevelProperty',
                title: 'TemperatureZone1',
                type: 'integer',
                description: 'Aktuelle Temperatur in °C',
                minimum: 0,
                maximum: 100,
                unit: '°C',
                readOnly: false,                
            }
        ));
        thing.addProperty(new Property(
            thing,
            'TemperaturZone2',
            new Value(20,(value)=>{console.log('Temperatur ist jetzt',value)}),
            {
                '@type': 'LevelProperty',
                title: 'Temperatur Zone 2',
                type: 'integer',
                description: 'Aktuelle Temperatur in °C',
                minimum: 0,
                maximum: 100,
                unit: '°C',
                readOnly: false,                
            }
        ));
        
        return new SingleThing(thing);
    }

    private killServer():void{
        if (this.server){
        this.server?.stop().then(
            ()=>{process.exit()}
        ).catch(
            ()=>{process.exit()}
        )}else{
            process.exit();
        }
    }
}

new Main().run();