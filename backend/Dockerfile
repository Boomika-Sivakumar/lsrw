# Multi-stage Dockerfile for Integrated LSRW AI Platform (Backend + Frontend)

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY ../frontend/package*.json ./
RUN npm ci
COPY ../frontend/ .
RUN npm run build

# Stage 2: Python FastAPI Backend + Integrated Frontend Bundle
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code and built frontend bundle
COPY . .
COPY --from=frontend-builder /build/frontend/dist ../frontend/dist

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
