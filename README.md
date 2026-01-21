<h1 align="center">KYROS: Smart Home Automation System</h1>

![CSS](https://img.shields.io/badge/css-%23663399.svg?style=for-the-badge&logo=css&logoColor=white)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![Bootstrap](https://img.shields.io/badge/bootstrap-%238511FA.svg?style=for-the-badge&logo=bootstrap&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Chart.js](https://img.shields.io/badge/chart.js-F5788D.svg?style=for-the-badge&logo=chart.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Arduino IDE](https://img.shields.io/badge/Arduino%20IDE-%2300979D.svg?style=for-the-badge&logo=Arduino&logoColor=white)
![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=claude&logoColor=white)
![Render](https://img.shields.io/badge/Render-%46E3B7.svg?style=for-the-badge&logo=render&logoColor=white)
---

<div style="text-align: right;">
  <a href="README.md">English</a> | <a href="README.es.md">Español</a>
</div>

## Description
<p>
  KYROS is an integrated IoT solution designed to automate and monitor residential environments. Developed by Computer Systems Engineering students at TecNM Campus Guasave, this system empowers users to control lighting, ventilation, security alarms, and surveillance cameras remotely. Our mission is to enhance home security, maximize occupant comfort, and promote energy efficiency through accessible technology.
  <br>
  
  **Live Demo** <br>
  You can explore the interface at: https://kyros-app.onrender.com
</p>

---

## System Arquitecture
The project utilizes a modern IoT stack to ensure real-time data synchronization:
- **Frontend:** A responsive web application for remote monitoring and control
- **Backend:** MongoDB Atlas serves as the centralized remote database for sensor logs and device states
- **Hardware Layer:** ESP32 microcontrollers acting as the bridge between physical sensors/actuators and the cloud
- **Communication:** Data is sent directly from the ESP32 to the database, ensuring the website reflects the current state of the home instantly

---

## Project functionalities
### **Secure Access**
- **User Management:** Robust sign-up and login system to protect home data and device control <br>
  <img width="696" height="497" alt="KYROS login" src="https://github.com/user-attachments/assets/569e2417-9be7-4f73-b378-7324b2605628" />
  
### **Room and Device Management**
- **Spatial Management:** Organize your home by adding or modifying specific rooms <br>
  <img width="697" height="483" alt="KYROS rooms" src="https://github.com/user-attachments/assets/69742cd3-1614-46f0-9edf-fa77d6e05b9d" />
- **Hardware Ecosystem:** Add and manage a variety of devices including sensors (temperature, motion), actuators (lights, fans), and security cameras within each room <br>
  <img width="696" height="486" alt="KYROS devices" src="https://github.com/user-attachments/assets/ae64bdce-1ef5-4284-85b8-09187cedc7e2" />

### **Automation and Real Time Monitoring**
- **Smart Actuators:** Trigger physical devices remotely through the web interface <br>
  <img width="692" height="486" alt="KYROS automatize" src="https://github.com/user-attachments/assets/b717f6bf-4713-4bbe-813d-897bf6bd13f1" />
- **Data Visualization:** View live telemetry and historical data graphs obtained from hardware sensors <br>
  <img width="696" height="497" alt="KYROS graph" src="https://github.com/user-attachments/assets/81c4370c-e306-4ec5-8131-474a44bc70ef" />
- **Surveillance:** Integrated live camera feed to monitor your home in real-time

---

## Technologies used
- Bootstrap
- CSS
- HTML5
- JavaScript
- MongoDB Atlas
- Node.js
- Render

---

## Hardware components
- 12V DC Fan
- Buzzer
- DHT22
- ESP32
- ESP32-CAM
- LDR
- LED light strip
- MQ2
- PIR
- Relay

---

## Team members
<table>
  <tr>
    <th> <br> Juan Luis Bojorquez Beltrán</th>
    <th> <br> Luis Alberto Castro Sandoval</th>
    <th> <br> Heydee Eglaim Perea Santos</th>
    <th> <br> Deisy Margarita Serrano Rentería</th>
  </tr>
</table>
