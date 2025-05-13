import os
from fastapi import FastAPI, WebSocket
import uvicorn

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        print(f"Получено: {data}")
        await websocket.send_text(f"Ответ: {data}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))  # Render задает PORT, если нет — используем 10000
    uvicorn.run(app, host="0.0.0.0", port=port)