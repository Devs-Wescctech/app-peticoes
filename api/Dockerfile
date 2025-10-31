FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 3001
# ajuste o módulo se necessário (ex.: app.main:app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001", "--proxy-headers"]
