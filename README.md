# proxonWOT
This is a WebOfThings compliant implementation for the Modbus interface of the Proxon FWT (https://www.zimmermann-lueftung.de/komforttechnik/die-proxon-geraete/proxon-fwt-serie-zentralgeraet). It allows to read and write the values (Temperatures, Fans, ...) accessible by Modbus.

It is required to have a working serial Modbus connection to the Proxon in place. This can be achieved via a simple RS232 to USB Adapter.

## License

[MIT](https://choosealicense.com/licenses/mit/)


## FAQ

#### How to install
These are the instructions for the command line:
> curl -L -O https://github.com/caralkas/proxonWOT/archive/main.tar.gz
> 
> tar -xzf main.tar.gz
> 
> rm main.tar.gz
> 
> cd proxonWOT-main/
> 
> npm install --production

Make sure you have Typescript installed either globally or for the project
> npm install typescript

When all is in place use the build script to transpile
> npm run build

#### How to start
The simplest option is to just use the start script
>npm run start
Afterwards the server should be up and running under port 8888. It can be accessed by a WebOfThings compatible client.

#### How do keep it permanently running
I use PM2 to start the server and keep it running even after a reboot.
First make sure PM2 is installed 
> npm install -g pm2

Afterwards create a PM2 configuration file
> nano ecosystem.config.js

Put the below code. It uses the home directory of the user PROXON. Adjust user and App directory as required.
```
  module.exports = {
	  apps : [{
		name   : "ProxonWOT",
		cwd : "/home/proxon/proxonWOT-main",
		script : "/home/proxon/proxonWOT-main/out/main.js"
	  }]
	}
```
Now schedule PM2 to register as service to automatically start after reboot
> pm2 startup

Finally start the server and persist the current PM2 task list.
> pm2 start ecosystem.config.js
> 
> pm2 save

#### What port is used
The port is: **8888**

## Installation

Install my-project with npm

```bash
  npm install my-project
  cd my-project
```
    
