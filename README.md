# homebridge-http-temperature

Supports https devices on HomeBridge Platform.
This is a simplified version of the https://github.com/lucacri/homebridge-http-temperature-humidity plugin.
This version only supports temperature sensors, not humidity.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-http-temperature
3. Update your configuration file. See sample-config.json in this repository for a sample.

# Configuration


Configuration sample file:

 ```
 "accessories": [
     {
         "accessory": "HttpTemperature",
         "name": "Outside Temperature",
         "url": "http://192.168.1.210/temperature?format=json",
         "http_method": "GET"
     }
 ]

```


The defined endpoint will return a json looking like this
```
{
	"temperature": 25.8
}
```


This plugin acts as an interface between a web endpoint and homebridge only. You will still need some dedicated hardware to expose the web endpoints with the temperature information. In my case, I used an Arduino board with Wifi capabilities.
