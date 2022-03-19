var Service, Characteristic;
const http_request = require('http').request;
const https_request = require('https').request;

const CELSIUS_UNITS = 'C',
      FAHRENHEIT_UNITS = 'F';
const DEF_MIN_TEMPERATURE = -100,
      DEF_MAX_TEMPERATURE = 130,
      DEF_UNITS = CELSIUS_UNITS,
      DEF_TIMEOUT = 5000,
      DEF_INTERVAL = 120000; //120s

module.exports = function (homebridge) {
   Service = homebridge.hap.Service;
   Characteristic = homebridge.hap.Characteristic;
   homebridge.registerAccessory("homebridge-http-temperature", "HttpTemperature", HttpTemperature);
}


function HttpTemperature(log, config) {
   this.log = log;

   this.name = config.name;
   this.url = config.url;
   const protocol = config.http_protocol ? config.protocol.toLowerCase() :
      (this.url.indexOf('http://') !== -1 ? 'http' : 'https');
   this.request = protocol === 'http' ? http_request : https_request;
   this.request_opts = {
      method: config.http_method || "GET",
      timeout: config.timeout || DEF_TIMEOUT,
   };
   this.manufacturer = config["manufacturer"] || "@metbosch";
   this.model = config["model"] || "Model not available";
   this.serial = config["serial"] || "Non-defined serial";
   this.fieldName = ( config["field_name"] != null ? config["field_name"] : "temperature" );
   this.minTemperature = config["min_temp"] || DEF_MIN_TEMPERATURE;
   this.maxTemperature = config["max_temp"] || DEF_MAX_TEMPERATURE;
   this.units = config["units"] || DEF_UNITS;
   this.update_interval = Number( config["update_interval"] || DEF_INTERVAL );
   this.debug = config["debug"] || false;

   //Check auth option
   if (config.auth && config.auth.user !== undefined && config.auth.pass !== undefined) {
      this.request_opts.auth = config.auth.user + ':' + config.auth.pass;
   } else if (config.auth) {
      this.log('Ignoring invalid auth options. "user" and "pass" must be provided');
   }

   //Check headers option
   if (config.http_headers) {
      this.request_opts.headers = config.http_headers;
   }

   //Check if units field is valid
   this.units = this.units.toUpperCase()
   if (this.units !== CELSIUS_UNITS && this.units !== FAHRENHEIT_UNITS) {
      this.log('Bad temperature units : "' + this.units + '" (assuming Celsius)');
      this.units = CELSIUS_UNITS;
   }

   // Internal variables
   this.last_value = null;
   this.waiting_response = false;
}

HttpTemperature.prototype = {

   logDebug: function (str) {
      if (this.debug) {
         this.log(str)
      }
   },

   updateState: function () {
      //Ensure previous call finished
      if (this.waiting_response) {
         this.logDebug('Avoid updateState as previous response does not arrived yet');
         return;
      }
      this.waiting_response = true;
      this.last_value = new Promise((resolve, reject) => {
         this.logDebug('Requesting temperature on "' + this.url);
         this.request(this.url, this.request_opts, (res) => {
            let body = '';
            res.on('data', (chunk) => {
               body += chunk;
            });
            res.on('end', () => {
               let value = null;
               try {
                  value = this.fieldName === '' ? body : this.getFromObject(JSON.parse(body), this.fieldName, '');
                  value = Number(value);
                  if (isNaN(value)) {
                     throw new Error('Received value is not a number: "' + value + '" ("' + body.substring(0, 100) + '")');
                  } else if (value < this.minTemperature || value > this.maxTemperature) {
                     var msg = 'Received value is out of bounds: "' + value + '". min=' + this.minTemperature +
                               ', max= ' + this.maxTemperature;
                     throw new Error(msg);
                  }
                  this.logDebug('HTTP successful response: ' + value);
                  if (this.units === FAHRENHEIT_UNITS) {
                     value = (value - 32)/1.8;
                     this.logDebug('Converted Fahrenheit temperature to celsius: ' + value);
                  }
               } catch (parseErr) {
                  this.logDebug('Error processing received information: ' + parseErr.message);
                  reject(error);
                  error = parseErr;
               }
               resolve(value);
               this.waiting_response = false;
            });
         }).on('error', (error) => {
            this.log('HTTP bad response: ' + error.message);
         }).end();
      });
      this.last_value.then((value) => {
         this.temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature).updateValue(value, null);
      }).catch((error) => {
         //TODO call temperatureService to set unavailable (issue 20)
      });
   },

   getState: function (callback) {
      this.logDebug('Call to getState: waiting_response is "' + this.waiting_response + '"' );
      this.updateState(); //This sets the promise in last_value
      this.last_value.then((value) => {
         callback(null, value);
      }).catch((error) => {
         callback(error, null);
      });
   },

   getServices: function () {
      this.informationService = new Service.AccessoryInformation();
      this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);

      this.temperatureService = new Service.TemperatureSensor(this.name);
      this.temperatureService
         .getCharacteristic(Characteristic.CurrentTemperature)
         .on('get', this.getState.bind(this))
         .setProps({
             minValue: this.minTemperature,
             maxValue: this.maxTemperature
         });

      if (this.update_interval > 0) {
         this.timer = setInterval(this.updateState.bind(this), this.update_interval);
      }

      return [this.informationService, this.temperatureService];
   },

   getFromObject: function (obj, path, def) {
      if (!path) return obj;

      const fullPath = path
        .replace(/\[/g, '.')
        .replace(/]/g, '')
        .split('.')
        .filter(Boolean);

      // Iterate all path elements to get the leaf, or untill the key is not found in the JSON
      return fullPath.every(everyFunc) ? obj : def;

      function everyFunc (step) {
        // Dynamically update the obj variable for the next call
        return !(step && (obj = obj[step]) === undefined);
      }
   }
};
