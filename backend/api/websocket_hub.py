import json
import logging
from typing import List, Set
from fastapi import WebSocket, WebSocketDisconnect
from backend.telemetry.schema import FullSystemState

logger = logging.getLogger(__name__)

class WebSocketHub:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_state(self, state: FullSystemState):
        if not self.active_connections:
            return

        payload = state.model_dump_json()
        dead_connections = []

        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

websocket_hub = WebSocketHub()
