const WebSocket = require('ws');

class WebSocketCameraServer {
  constructor(server) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws/camera'
    });

    // Mapa de cámaras: { cameraId: { esp32: WebSocket, viewers: Set<WebSocket> } }
    this.cameras = new Map();

    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws, req) => {
      console.log(`[WebSocket] Nueva conexión desde ${req.socket.remoteAddress}`);

      ws.on('message', (data) => {
        try {
          // Verificar si es mensaje de configuración (JSON) o frame binario
          if (data instanceof Buffer && data[0] === 0xFF && data[1] === 0xD8) {
            // Es una imagen JPEG (empieza con FF D8)
            this.handleFrameData(ws, data);
          } else {
            // Es mensaje de configuración JSON
            const message = JSON.parse(data.toString());
            this.handleControlMessage(ws, message);
          }
        } catch (error) {
          console.error('[WebSocket] Error procesando mensaje:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });
    });

    console.log('[WebSocket] Servidor iniciado en /ws/camera');
  }

  handleControlMessage(ws, message) {
    const { type, cameraId, clientType } = message;

    switch (type) {
      case 'register_esp32':
        // ESP32 se registra como emisor
        if (!this.cameras.has(cameraId)) {
          this.cameras.set(cameraId, { esp32: null, viewers: new Set() });
        }
        const camera = this.cameras.get(cameraId);
        camera.esp32 = ws;
        ws.cameraId = cameraId;
        ws.isESP32 = true;

        console.log(`[WebSocket] ESP32 registrado para cámara ${cameraId}`);
        ws.send(JSON.stringify({ type: 'registered', success: true }));
        break;

      case 'subscribe':
        // Cliente web se suscribe como viewer
        if (!this.cameras.has(cameraId)) {
          this.cameras.set(cameraId, { esp32: null, viewers: new Set() });
        }
        const cam = this.cameras.get(cameraId);
        cam.viewers.add(ws);
        ws.cameraId = cameraId;
        ws.isViewer = true;

        console.log(`[WebSocket] Viewer suscrito a cámara ${cameraId} (${cam.viewers.size} viewers)`);
        ws.send(JSON.stringify({
          type: 'subscribed',
          success: true,
          esp32Connected: cam.esp32 !== null && cam.esp32.readyState === WebSocket.OPEN
        }));
        break;

      default:
        console.warn(`[WebSocket] Tipo de mensaje desconocido: ${type}`);
    }
  }

  handleFrameData(ws, frameBuffer) {
    // Solo los ESP32 pueden enviar frames
    if (!ws.isESP32 || !ws.cameraId) {
      console.warn('[WebSocket] Frame recibido de cliente no-ESP32, ignorado');
      return;
    }

    const camera = this.cameras.get(ws.cameraId);
    if (!camera) return;

    // Broadcast a todos los viewers conectados
    let successCount = 0;
    camera.viewers.forEach((viewer) => {
      if (viewer.readyState === WebSocket.OPEN) {
        viewer.send(frameBuffer);
        successCount++;
      }
    });

    // Log cada 30 frames (aprox. 2-3 segundos a 10fps)
    if (!ws.frameCount) ws.frameCount = 0;
    ws.frameCount++;
    if (ws.frameCount % 30 === 0) {
      console.log(`[WebSocket] Cámara ${ws.cameraId}: Frame #${ws.frameCount} → ${successCount} viewers`);
    }
  }

  handleDisconnection(ws) {
    if (ws.isESP32 && ws.cameraId) {
      const camera = this.cameras.get(ws.cameraId);
      if (camera) {
        camera.esp32 = null;
        console.log(`[WebSocket] ESP32 desconectado (cámara ${ws.cameraId})`);

        // Notificar a viewers que el ESP32 se desconectó
        camera.viewers.forEach((viewer) => {
          if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ type: 'esp32_disconnected' }));
          }
        });
      }
    }

    if (ws.isViewer && ws.cameraId) {
      const camera = this.cameras.get(ws.cameraId);
      if (camera) {
        camera.viewers.delete(ws);
        console.log(`[WebSocket] Viewer desconectado (cámara ${ws.cameraId}, quedan ${camera.viewers.size})`);
      }
    }
  }

  // Método para verificar estado de una cámara
  getCameraStatus(cameraId) {
    const camera = this.cameras.get(cameraId);
    if (!camera) {
      return { connected: false, viewers: 0 };
    }
    return {
      connected: camera.esp32 !== null && camera.esp32.readyState === WebSocket.OPEN,
      viewers: camera.viewers.size
    };
  }
}

module.exports = WebSocketCameraServer;
