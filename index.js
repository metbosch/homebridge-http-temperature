var Service, Characteristic;
var request = require('request');

const DEF_MIN_TEMPERATURE = -100,
      DEF_MAX_TEMPERATURE = 100,
      DEF_TIMEOUT = 5000;

module.exports = function (homebridge) {
   Service = homebridge.hap.Service;
   Characteristic = homebridge.hap.Characteristic;
   homebridge.registerAccessory("homebridge-http-temperature", "HttpTemperature", HttpTemperature);
}


function HttpTemperature(log, config) {
   this.log = log;

   // url info
   this.url = config["url"];
   this.http_method = config["http_method"] || "GET";
   this.name = config["name"];
   this.manufacturer = config["manufacturer"] || "@metbosch manufacturer";
   this.model = config["model"] || "Model not available";
   this.serial = config["serial"] || "Non-defined serial";
   this.fieldName = config["field_name"] || "temperature";
   this.timeout = config["timeout"] || DEF_TIMEOUT;
   this.minTemperature = config["min_temp"] || DEF_MIN_TEMPERATURE;
   this.maxTemperature = config["max_temp"] || DEF_MAX_TEMPERATURE;
   this.auth = config["auth"];
   this.refresh = config["refresh"] || 300;//5 minutes polling
      
   setInterval(this.polling.bind(this), this.refresh * 1000);
}

HttpTemperature.prototype = {

   getState: function (callback) {
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
               var value = JSON.parse(body);
               var temperature = value.values[1][1].toString();       
               temperaturesub = temperature.substr(0, temperature.length-2);
               value = (temperaturesub - 32) * (5/9);
               if (value < this.minTemperature || value > this.maxTemperature || isNaN(value)) {
                  throw new Error("Invalid value received");
               }
               this.log('HTTP successful response: ' + value);
            } catch (parseErr) {
               this.log('Error processing received information: ' + parseErr.message);
               error = parseErr;
            }
         }
         callback(error, value);
      });
   },
      
  polling: function(){
      this.log("Polling Tempearture");
      this.temperatureService
         .getCharacteristic(Characteristic.CurrentTemperature).getValue();
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
      return [this.informationService, this.temperatureService];
   }
};
