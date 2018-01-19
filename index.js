const GrovePi = require('node-grovepi').GrovePi;
const mqtt = require('mqtt')
const Commands = GrovePi.commands;
const Board = GrovePi.board;
const LightAnalogSensor = GrovePi.sensors.LightAnalog;
const AirQualityAnalog = GrovePi.sensors.AirQualityAnalog;

var currentLightValue = 0;
var currentAirValue = 0;
var currentQualityLevel = 'good';

const client = mqtt.connect('mqtt://test.mosquitto.org');

var publishPayload = (payload) => {
    console.log(new Date().toISOString() + ' | Publishing payload: ' + JSON.stringify(payload));
    client.publish('n52/littlegrandrapids', JSON.stringify(payload));
};

var board = new Board({
    debug: true,
    onError: function (err) {
        console.log('Something wrong just happened');
        console.log(err);
    },
    onInit: function (res) {
        if (res) {
            console.log('GrovePi Version :: ' + board.version());

            var lightSensor = new LightAnalogSensor(0);
            lightSensor.on('change', function (sensorValue) {
                currentLightValue = (1023 - sensorValue) * 10 / sensorValue;
            });
            lightSensor.watch();

            var airSensor = new AirQualityAnalog(1);
            airSensor.on('change', function (sensorValue) {
                let qualityLevel;
                if (sensorValue < 100) {
                    qualityLevel = 'good';
                } else if (sensorValue < 250) {
                    qualityLevel = 'moderate';
                } else if (sensorValue < 400) {
                    qualityLevel = 'unhealthyForSensitiveGroups';
                } else if (sensorValue < 500) {
                    qualityLevel = 'unhealthy';
                } else if (sensorValue < 600) {
                    qualityLevel = 'veryUnhealthy';
                } else {
                    qualityLevel = 'hazardous';
                }

                currentQualityLevel = qualityLevel;
                currentAirValue = sensorValue;
            });
            airSensor.watch();
        }
    }
});

board.init();

client.on('connect', () => {
    publishPayload({
        date: new Date().toISOString(),
        message: 'service started'
    });

    setInterval(() => {
        publishPayload({
            date: new Date().toISOString(),
            airQuality: {
                level: currentQualityLevel,
                rawValue: currentAirValue
            },
            lightValue: currentLightValue
        });
    }, 1000 * 60 * 1);
});
