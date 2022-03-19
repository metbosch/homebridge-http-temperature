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
  - Mandatory
    - `url` Endpoint URL (must start with `http://` or `https://`).
    - `name` Accessory name.
  - Optional
    - `auth` Object with `user` and `pass` fields used to authenticate the request using basic http auth.
    - `debug` Enable/disable debug logs (Default: false).
    - `field_name` Field path that will be used from the JSON response of the endpoint.
      Alternatively, if the `field_name` contains an empty string (`"field_name": ""`), the expected response is directly the current temperature value (Default: temperature).
    - `http_headers` Object with headers for http requests.
      See [http.request documentation](https://nodejs.org/api/http.html#httprequesturl-options-callback) for more information.
    - `http_method` HTTP method used to get the temperature (Default: GET).
    - `http_protocol` http/https protocol to use (Default: infered from url).
      Supported values are: `"http"` and `"https"`.
    - `manufacturer` Additional information for the accessory.
    - `min_temp` Min. temperature that can be returned by the endpoint (Default: -100).
    - `max_temp` Max. temperature that can be returned by the endpoint (Default: 130).
    - `model` Additional information for the accessory.
    - `serial` Additional information for the accessory.
    - `timeout` Waiting time for the endpoint response before fail (Default: 5000ms).
    - `units` Temperature units of the value returned by the endpoint.
      Supported values are: `"C"` for Celsius and `"F"` for Fahrenheit (Default: 'C').
    - `update_interval` If not zero, the field defines the polling period in milliseconds for the sensor state (Default is 120000ms).
      When the value is zero, the state is only updated when homebridge requests the current value.

## Examples

The following sections provide different configuration examples.
For a ready-to-go example, see the `sample-config.json` file in the git repository.

### Minimal HTTP

```
"accessories": [
  {
    "accessory": "HttpTemperature",
    "name": "Outside Temperature",
    "url": "http://IP/path/to/endpoint"
  }
]
```

### HTTPS + Auth + JSON-field

```
"accessories": [
  {
    "accessory": "HttpTemperature",
    "name": "Outside Temperature",
    "url": "https://IP/path/to/endpoint",
    "field_name": "temperature",
    "auth": {
        "user": "test",
        "pass": "1234"
    }
  }
]
```

With this configuration, the endpoint should return a JSON with (at least) a `temperature` field.
It should look like:

```
{
	"temperature": 25.8
}
```

### Advanced JSON parsing

If the defined endpoint returns something more complicated like:
```
{
  "time": "YYYY-MM-DD HH:MM:SS",
  "device_info": {
    ...
  },
  "values": [
    {
      "temp1": 31.5,
      "temp2": 24.1
    },
    {
      "temp1": 27.8,
      "temp2": 29.3
    }
  ]
}
```

The configuration to get `temp2` from 1st set of values would look like:

```
"accessories": [
  {
    "accessory": "HttpTemperature",
    "name": "Outside Temperature",
    "url": "https://IP/path/to/endpoint",
    "field_name": "values.[0].temp2",
  }
]
```
