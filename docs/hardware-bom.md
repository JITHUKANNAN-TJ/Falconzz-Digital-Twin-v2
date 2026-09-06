# Physical BLDC Testbed: Bill of Materials (BOM) & Hardware Procurement Specification

## 1. Procurement-Ready Component Schedule

| No. | Component Name | Technical Specification | Quantity | Primary Purpose | Interface | Recommended Part Class | Alternative Option | Estimated Cost (INR) | Safety Considerations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **BLDC Propulsion Motor** | 880-920 Kv, 2216 / 2312 Class, 3S-4S, Max 280W, 14-pole | 1 | Laboratory validation propulsion actuator | 3-Phase Bullet (3.5mm) | SunnySky V2216 / T-Motor Air 2216 | EMAX MT2213 / ReadyToSky 2212 | ₹1,500 – ₹2,500 | Secure clamp mount, avoid touching rotor during run |
| 2 | **Electronic Speed Controller (ESC)** | 30A-40A BLHeli_32 / DShot600 with telemetry output | 1 | Commutation & direct ESC RPM/current telemetry | PWM / UART Telemetry | Holybro Tekko32 35A / Hobbywing XRotor 40A | SimonK 30A (standard PWM) | ₹1,200 – ₹2,200 | Heat-sink airflow, prevent reverse polarity |
| 3 | **Flight Controller (FC)** | APM 2.8 / Pixhawk 2.4.8 (STM32F427 + MPU6000 + MS5611) | 1 | Flight avionics & MAVLink telemetry master | USB / UART / I2C | Pixhawk 2.4.8 / APM 2.8 ArduPilot | Cube Black / Matek H743 | ₹3,500 – ₹6,500 | Firmware v4.0+, verify baud rate matching |
| 4 | **Auxiliary Microcontroller** | ESP32-WROOM-32 (Dual Core 240MHz, Wi-Fi/BLE) | 1 | High-speed dedicated sensor DAQ node | USB / Wi-Fi UDP (Port 8888) | NodeMCU ESP32 | Arduino Uno / Nano (ATmega328P) | ₹450 – ₹650 | 3.3V logic level shifting on 5V sensors |
| 5 | **Voltage & Current Sensor** | INA219 High-Side Bi-directional I2C Current Sensor (26V, 3.2A-30A) | 1 | Precision DC bus current & power measurement | I2C (0x40) | Texas Instruments INA219 | ACS712 30A Hall Current Sensor | ₹250 – ₹450 | Keep shunt resistor clear of heat sources |
| 6 | **Optical / Hall RPM Sensor** | TCRT5000 IR Reflective or A3144 Hall Effect Sensor | 1 | Direct optical pulse tachometer | Digital Interrupt (GPIO 18) | TCRT5000 / A3144 Hall | Sharp GP2Y0A21 / Reed Switch | ₹120 – ₹250 | Minimum 1.2mm airgap, protect from ambient light |
| 7 | **Temperature Sensor** | DS18B20 Waterproof 1-Wire Digital Stator Temp Sensor | 1 | Direct stator coil surface temperature | 1-Wire (GPIO 4) + 4.7kΩ pullup | Dallas DS18B20 | NTC 100k Thermistor / LM35 | ₹150 – ₹300 | Thermal conductive epoxy mounting |
| 8 | **3-Axis Accelerometer** | MPU6050 6-DOF IMU (Accelerometer ±16g, Gyro ±2000°/s) | 1 | Testbed rotational unbalance & bearing vibration | I2C (0x68) | InvenSense MPU6050 | ADXL345 (SPI/I2C) | ₹180 – ₹350 | Mount rigidly to motor base plate |
| 9 | **Dynamometer Test Stand** | Rigid extruded aluminum 2020 frame + load cell thrust mount | 1 | Mechanical isolation & torque reaction stand | Mechanical Bracket | RC Thrust Stand Base | Custom 3D Printed / Laser cut acrylic | ₹1,800 – ₹3,500 | Polycarbonate safety enclosure guard |
| 10 | **DC Power Supply / LiPo** | 4S 14.8V 2200mAh 35C LiPo Battery or 15V 30A Bench Supply | 1 | DC electrical power delivery | XT60 Connector | GensAce / Tattu 4S 2200mAh | 15V 30A SMPS Bench Supply | ₹2,200 – ₹4,500 | In-line 35A automotive fuse + emergency stop |
| 11 | **Propeller** | 10x4.5 Carbon-reinforced nylon propeller | 2 | Aerodynamic drag load generation | Motor Collet (5mm) | APC 10x4.5 MR / Gemfan 1045 | Master Airscrew 10x4.5 | ₹250 – ₹500 | Balance blades prior to testing |
| 12 | **Emergency Cutoff Switch** | Heavy-duty latching mushroom E-Stop push button | 1 | Physical emergency power disconnect | High-Current Series NC | 250V 10A Latching Industrial E-Stop | In-line 40A DC circuit breaker | ₹350 – ₹600 | Mount prominently on ground station console |

**Total Estimated Rig Procurement Budget:** ₹11,750 – ₹21,800 INR ($140 – $260 USD)
