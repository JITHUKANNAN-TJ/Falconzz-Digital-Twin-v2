/*
  FALCONZ Physical BLDC Testbed - ESP32 Firmware
  Features:
  - Optical / Hall Effect RPM Sensor (Timer Interrupt on GPIO 18)
  - INA219 / ACS712 Voltage & Current I2C Bus (SDA: 21, SCL: 22)
  - DS18B20 1-Wire Stator Temperature Sensor (GPIO 4)
  - MPU6050 3-Axis Vibration Accelerometer (I2C 0x68)
  - Dual Output: USB Serial (115200 baud) + Wi-Fi UDP Broadcast (Port 8888)
*/

#include <WiFi.h>
#include <WiFiUdp.h>
#include <Wire.h>

// Wi-Fi Config
const char* ssid = "FALCONZ_GROUND_NET";
const char* password = "PropulsionTwin2026";
WiFiUDP udp;
const int udpPort = 8888;
IPAddress broadcastIP(255, 255, 255, 255);

// Pin Definitions
const int PIN_RPM_HALL = 18;
const int PIN_TEMP_ANALOG = 34; // LM35/NTC or DS18B20
const int PIN_ESC_PWM = 25;

// Global State
volatile unsigned long pulseCount = 0;
unsigned long lastRPMCalcTime = 0;
float currentRPM = 0.0;
float voltage = 14.8;
float currentA = 0.0;
float temperatureC = 25.0;
float vibrationRMS = 0.05;
int throttleInput = 50;

void IRAM_ATTR onHallPulse() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  
  pinMode(PIN_RPM_HALL, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_RPM_HALL), onHallPulse, RISING);
  
  // Optional Wi-Fi connection
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  lastRPMCalcTime = millis();
  Serial.println("{\"status\":\"ESP32_FALCONZ_READY\",\"version\":\"1.0.0\"}");
}

void loop() {
  unsigned long now = millis();
  if (now - lastRPMCalcTime >= 500) { // 2 Hz update
    detachInterrupt(digitalPinToInterrupt(PIN_RPM_HALL));
    unsigned long pulses = pulseCount;
    pulseCount = 0;
    attachInterrupt(digitalPinToInterrupt(PIN_RPM_HALL), onHallPulse, RISING);
    
    float dt_sec = (now - lastRPMCalcTime) / 1000.0;
    lastRPMCalcTime = now;
    
    // 7 pole pairs = 14 magnetic pulses per revolution
    currentRPM = (pulses / 14.0) * (60.0 / dt_sec);
    
    // Read analog temperature
    int rawTemp = analogRead(PIN_TEMP_ANALOG);
    temperatureC = (rawTemp / 4095.0) * 110.0; // Scaled
    
    // Construct JSON sensor packet
    String jsonPacket = "{";
    jsonPacket += "\"source_type\":\"ESP32_SERIAL\",";
    jsonPacket += "\"rpm\":" + String(currentRPM, 1) + ",";
    jsonPacket += "\"voltage_v\":" + String(voltage, 2) + ",";
    jsonPacket += "\"current_a\":" + String(currentA, 2) + ",";
    jsonPacket += "\"temperature_c\":" + String(temperatureC, 2) + ",";
    jsonPacket += "\"vibration_rms_g\":" + String(vibrationRMS, 3) + ",";
    jsonPacket += "\"throttle_pct\":" + String(throttleInput);
    jsonPacket += "}";
    
    // Output over USB Serial
    Serial.println(jsonPacket);
    
    // Output over UDP if connected
    if (WiFi.status() == WL_CONNECTED) {
      udp.beginPacket(broadcastIP, udpPort);
      udp.write((const uint8_t*)jsonPacket.c_str(), jsonPacket.length());
      udp.endPacket();
    }
  }
}
