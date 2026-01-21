<h1 align="center">KYROS: Sistema de Automatización del Hogar Inteligente</h1>

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

## Descripción
<p>
  KYROS es una solución integrada de IoT diseñada para automatizar y monitorear entornos residenciales. Desarrollado por estudiantes de Ingeniería en Sistemas Computacionales del TecNM Campus Guasave, este sistema permite a los usuarios controlar la iluminación, la ventilación, las alarmas de seguridad y las cámaras de vigilancia de forma remota. Nuestra misión es mejorar la seguridad del hogar, maximizar la comodidad de los ocupantes y promover la eficiencia energética mediante tecnología accesible.
  <br>

  **Demostración en vivo** <br>
  Puedes explorar la interfaz en: https://kyros-app.onrender.com
</p>

---

## Arquitectura del sistema
El proyecto utiliza una pila moderna de IoT para garantizar la sincronización de datos en tiempo real:
- **Frontend:** Una aplicación web responsiva para la monitorización y el control remoto
- **Backend:** MongoDB Atlas funciona como base de datos remota centralizada para los registros de sensores y el estado de los dispositivos
- **Capa de hardware:** Microcontroladores ESP32 que actúan como puente entre los sensores/actuadores físicos y la nube
- **Comunicación:** Los datos se envían directamente desde el ESP32 a la base de datos, lo cual garantiza que el sitio web refleje el estado actual de la vivienda al instante

---

## Funcionalidades del proyecto
### **Acceso Seguro**
- **Gestión de usuarios:** Sistema robusto de registro e inicio de sesión para proteger los datos del hogar y el control de los dispositivos <br>
  <img width="696" height="497" alt="KYROS login" src="https://github.com/user-attachments/assets/569e2417-9be7-4f73-b378-7324b2605628" />
  
### **Gestión de Habitaciones y Dispositivos**
- **Gestión espacial:** Organice su hogar agregando o modificando habitaciones específicas <br>
  <img width="697" height="483" alt="KYROS rooms" src="https://github.com/user-attachments/assets/69742cd3-1614-46f0-9edf-fa77d6e05b9d" />
- **Ecosistema de Hardware:** Agregue y administre una variedad de dispositivos, incluidos sensores (temperatura, movimiento), actuadores (luces, ventiladores) y cámaras de seguridad dentro de cada habitación <br>
  <img width="696" height="486" alt="KYROS devices" src="https://github.com/user-attachments/assets/ae64bdce-1ef5-4284-85b8-09187cedc7e2" />

### **Automatización y Monitoreo en Tiempo Real**
- **Actuadores Inteligentes:** Active dispositivos físicos de forma remota a través de la interfaz web <br>
  <img width="692" height="486" alt="KYROS automatize" src="https://github.com/user-attachments/assets/b717f6bf-4713-4bbe-813d-897bf6bd13f1" />
- **Visualización de Datos:** Visualice telemetría en vivo y gráficos de datos históricos obtenidos de sensores de hardware <br>
  <img width="696" height="497" alt="KYROS graph" src="https://github.com/user-attachments/assets/81c4370c-e306-4ec5-8131-474a44bc70ef" />
- **Vigilancia:** Transmisión de cámara en vivo integrada para monitorear su hogar en tiempo real

---

## Tecnologías utilizadas
- Bootstrap
- CSS
- HTML5
- JavaScript
- MongoDB Atlas
- Node.js
- Render

---

## Componentes de hardware
- Buzzer
- DHT22
- ESP32
- ESP32-CAM
- LDR
- MQ2
- PIR
- Relay
- Tira de luz LED
- Ventilador DC 12V

---

## Miembros del equipo
<table>
  <tr>
    <th> <br> Juan Luis Bojorquez Beltrán</th>
    <th> <br> Luis Alberto Castro Sandoval</th>
    <th> <br> Heydee Eglaim Perea Santos</th>
    <th> <br> Deisy Margarita Serrano Rentería</th>
  </tr>
</table>
