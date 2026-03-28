# CareerRadar Backend Dockerfile
# Optimized for Playwright & Fast Boot
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_HOME=/app

# Create app directory
WORKDIR $APP_HOME

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu


# Copy application code
COPY config/ $APP_HOME/config/
COPY ingestion/ $APP_HOME/ingestion/
COPY api/ $APP_HOME/api/
COPY database/ $APP_HOME/database/
COPY pipeline/ $APP_HOME/pipeline/
COPY assessment/ $APP_HOME/assessment/
COPY utils/ $APP_HOME/utils/
COPY main.py $APP_HOME/

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser $APP_HOME
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
