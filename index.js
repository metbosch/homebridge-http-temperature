var Service, Characteristic;
var request = require('request');

const CELSIUS_UNITS = 'C',
      FAHRENHEIT_UNITS = 'F';
const DEF_MIN_TEMPERATURE = -100,
      DEF_MAX_TEMPERATURE = 100,
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

   this.url = config["url"];
   this.http_method = config["http_method"] || "GET";
   this.name = config["name"];
   this.manufacturer = config["manufacturer"] || "@metbosch manufacturer";
   this.model = config["model"] || "Model not available";
   this.serial = config["serial"] || "Non-defined serial";
   this.fieldName = ( config["field_name"] != null ? config["field_name"] : "temperature" );
   this.timeout = config["timeout"] || DEF_TIMEOUT;
   this.minTemperature = config["min_temp"] || DEF_MIN_TEMPERATURE;
   this.maxTemperature = config["max_temp"] || DEF_MAX_TEMPERATURE;
   this.units = config["units"] || DEF_UNITS;
   this.auth = config["auth"];
   this.update_interval = Number( config["update_interval"] || DEF_INTERVAL );

   //Check if units field is valid
   this.units = this.units.toUpperCase()
   if (this.units !== CELSIUS_UNITS && this.units !== FAHRENHEIT_UNITS) {
      this.log('Bad temperature units : "' + this.units + '" (assuming Celsius).');
      this.units = CELSIUS_UNITS;
   }

   // Internal variables
   this.last_value = null;
   this.waiting_response = false;
}

HttpTemperature.prototype = {

   updateState: function () {
      //Ensure previous call finished
      if (this.waiting_response) {
         this.log('Avoid updateState as previous response does not arrived yet');
         return;
      }
      this.waiting_response = true;
      this.last_value = new Promise((resolve, reject) => {
         var ops = {
            uri:    this.url,
            method: this.http_method,
            timeout: this.timeout
         };
         this.log('Requesting temperature on "' + ops.uri + '", method ' + ops.method);
         if (this.auth) {
            ops.auth = {
               user: this.auth.user,
               pass: this.auth.pass
            };
         }
         request(ops, (error, res, body) => {
            var value = null;
            if (error) {
               this.log('HTTP bad response (' + ops.uri + '): ' + error.message);
            } else {
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
                  this.log('HTTP successful response: ' + value);
                  if (this.units === FAHRENHEIT_UNITS) {
                     value = (value - 32)/1.8;
                     this.log('Converted Fahrenheit temperature to celsius: ' + value);
                  }
               } catch (parseErr) {
                  this.log('Error processing received information: ' + parseErr.message);
                  error = parseErr;
               }
            }
            if (!error) {
               resolve(value);
            } else {
               reject(error);
            }
            this.waiting_response = false;
         });
      }).then((value) => {
         this.temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature).updateValue(value, null);
         return value;
      }, (error) => {
         //For now, only to avoid the NodeJS warning about uncatched rejected promises
         return error;
      });
   },

   getState: function (callback) {
      this.log('Call to getState: waiting_response is "' + this.waiting_response + '"' );
      this.updateState(); //This sets the promise in last_value
      this.last_value.then((value) => {
         callback(null, value);
         return value;
      }, (error) => {
         callback(error, null);
         return error;
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
