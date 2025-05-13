import os
from fastapi import FastAPI, Request
import uvicorn

app = FastAPI()

@app.post("/receive")
async def receive_data(request: Request):
    data = await request.json()  # Получаем JSON-данные
    print(f"Получено: {data}")
    return {"status": "success", "received": data}  # Отправляем ответ клиенту

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))  # Используем порт от Render
    uvicorn.run(app, host="0.0.0.0", port=port)