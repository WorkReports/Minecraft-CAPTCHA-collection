import os
from fastapi import FastAPI, Request
import uvicorn

app = FastAPI()

# Словарь с предопределёнными ответами
response_data = {
    "get_password": "12345678",
    "get_username": "BotUser",
    "get_token": "ABC123XYZ"
}

@app.post("/receive")
async def receive_data(request: Request):
    data = await request.json()  # Получаем JSON-данные
    message = data.get("message")  # Извлекаем команду

    print(f"Получено: {data}")  # Логируем входящие данные

    # Проверяем, есть ли соответствие входным данным
    response = response_data.get(message, "Команда не найдена")

    return {"status": "success", "result": response}  # Возвращаем ответ клиенту

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))  # Используем порт от Render
    uvicorn.run(app, host="0.0.0.0", port=port)
