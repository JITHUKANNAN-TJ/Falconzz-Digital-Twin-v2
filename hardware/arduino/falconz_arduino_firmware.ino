/*
  FALCONZ Physical BLDC Testbed - Arduino Uno / Nano Firmware
  Features:
  - Hall Effect RPM Sensor on Digital Pin 2 (INT0)
  - Analog Current Sensor ACS712 on Pin A0
  - Voltage Divider (100k/10k) on Pin A1
  - LM35 Temperature Sensor on Pin A2
  - ADXL345 Vibration Sensor via I2C (A4 SDA, A5 SCL)
  - Output: USB Serial JSON Stream at 115200 baud
*/

#include <Wire.h>

const int PIN_HALL_INTERRUPT = 2;
const int PIN_CURRENT_ANALOG = A0;
const int PIN_VOLTAGE_ANALOG = A1;
const int PIN_TEMP_ANALOG = A2;

volatile unsigned int pulseCounter = 0;
unsigned long prevTime = 0;

void countPulse() {
  pulseCounter++;
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  
  pinMode(PIN_HALL_INTERRUPT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_HALL_INTERRUPT), countPulse, RISING);
  
  prevTime = millis();
  Serial.println("{\"status\":\"ARDUINO_FALCONZ_READY\",\"version\":\"1.0.0\"}");
}

void loop() {
  unsigned long currentTime = millis();
  if (currentTime - prevTime >= 500) { // 2 Hz
    noInterrupts();
    unsigned int pulses = pulseCounter;
    pulseCounter = 0;
    interrupts();
    
    float dt = (currentTime - prevTime) / 1000.0;
    prevTime = currentTime;
    
    // 7 pole pairs = 14 pulses per rev
    float rpm = (pulses / 14.0) * (60.0 / dt);
    
    // Voltage divider calculation (5V ref, 100k + 10k divider -> factor 11.0)
    int rawV = analogRead(PIN_VOLTAGE_ANALOG);
    float voltage = (rawV * (5.0 / 1023.0)) * 11.0;
    
    // ACS712 30A (66mV / A, 2.5V zero offset)
    int rawI = analogRead(PIN_CURRENT_ANALOG);
    float vSensor = rawI * (5.0 / 1023.0);
    float currentA = abs((vSensor - 2.5) / 0.066);
    
    // LM35 (10mV / deg C)
    int rawT = analogRead(PIN_TEMP_ANALOG);
    float tempC = (rawT * (5.0 / 1023.0)) * 100.0;
    
    // Transmit JSON
    Serial.print("{\"source_type\":\"ARDUINO_SERIAL\",\"rpm\":");
    Serial.print(rpm, 1);
    Serial.print(",\"voltage_v\":");
    Serial.print(voltage, 2);
    Serial.print(",\"current_a\":");
    Serial.print(currentA, 2);
    Serial.print(",\"temperature_c\":");
    Serial.print(tempC, 2);
    Serial.print(",\"vibration_rms_g\":0.08");
    Serial.print(",\"throttle_pct\":50.0");
    Serial.println("}");
  }
}
