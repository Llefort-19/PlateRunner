# HTE App - Beta Web Deployment
# Uses Miniconda for RDKit support (not available via pip alone)
FROM continuumio/miniconda3:latest

WORKDIR /app

# System dependencies (libmagic for python-magic file validation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18 for building the React frontend
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install RDKit + Python 3.11 via conda (pinned for reproducibility)
RUN conda install -y -c conda-forge python=3.11 rdkit \
    && conda clean -afy

# Install Python runtime dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Build React frontend
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install --legacy-peer-deps
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend application
COPY backend/ ./backend/

# Copy reference data files (Inventory.xlsx, Solvent.xlsx)
# These will be overridden by the persistent volume in production
COPY data/ ./data/

# Pre-create instance directory for SQLite database
RUN mkdir -p /data backend/instance

WORKDIR /app/backend

EXPOSE 5000

ENV FLASK_ENV=production
ENV DATA_FOLDER_PATH=/data

# Make startup script executable (seeds reference data then launches gunicorn)
RUN chmod +x start.sh

CMD ["./start.sh"]
