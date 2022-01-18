# homebridge-http-temperature

Supports http/https devices on HomeBridge Platform.
This version only supports temperature sensors returning a JSON with the data or the raw data.

This plug-in acts as an interface between a web endpoint and homebridge only. You will still need some dedicated hardware to expose the web endpoints with the temperature information. In my case, I used an Arduino board with Wifi capabilities.

# Installation

1. Install homebridge using: ```npm install -g homebridge```
2. Install this plugin using: ```npm install -g homebridge-http-temperature```
3. Update your configuration file. See sample-config.json in this repository for a sample.

# Configuration

The available fields in the config.json file are:
 - `url` [Mandatory] Endpoint URL.
 - `name` [Mandatory] Accessory name.
 - `http_method` [Optional] HTTP method used to get the temperature (Default: GET)
 - `manufacturer` [Optional] Additional information for the accessory.
 - `model` [Optional] Additional information for the accessory.
 - `serial` [Optional] Additional information for the accessory.
 - `field_name` [Optional] Field path that will be used from the JSON response of the endpoint. Alternatively, if the `field_name` contains an empty string (`"field_name": ""`), the expected response is directly the current temperature value (Default: temperature).
 - `timeout` [Optional] Waiting time for the endpoint response before fail (Default: 5000ms).
 - `min_temp` [Optional] Min. temperature that can be returned by the endpoint (Default: -100).
 - `max_temp` [Optional] Max. temperature that can be returned by the endpoint (Default: 130).
 - `units` [Optional] Temperature units of the value returned by the endpoint. Supported values are: `"C"` for Celsius and `"F"` for Fahrenheit (Default: 'C').
 - `auth` [Optional] JSON with `user` and `pass` fields used to authenticate the request into the device.
 - `update_interval` [Optional] If not zero, the field defines the polling period in milliseconds for the sensor state (Default is 120000ms). When the value is zero, the state is only updated when homebridge requests the current value.
 - `debug` [Optional] Enable/disable debug logs (Default: false).


Example:

 ```
 "accessories": [
     {
         "accessory": "HttpTemperature",
         "name": "Outside Temperature",
         "url": "http://192.168.1.210/temperature?format=json",
         "http_method": "GET",
         "field_name": "temperature",
         "auth": {
             "user": "test",
             "pass": "1234"
         }
     }
 ]

```

The defined endpoint will return a json looking like this:
```
{
	"temperature": 25.8
}
```

If the defined endpoint returns something more complicated like:
```
[
  {
    "temp1": 31.5,
    "temp2": 24.1
  },
  {
    "temp1": 27.8,
    "temp2": 29.3
  }
]
```

You can define the `field_name` as something like `[0].temp2`
