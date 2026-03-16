#!/bin/sh
# Startup script for HTE App on Render / Docker
# Copies bundled Excel reference data to the persistent disk on first run,
# then starts gunicorn.

DATA_DIR="${DATA_FOLDER_PATH:-/data}"
BUNDLED_DATA="/app/bundled_data"

# Seed reference data files to the persistent volume if not already there
for f in Inventory.xlsx Solvent.xlsx Private_Inventory.xlsx; do
    if [ ! -f "$DATA_DIR/$f" ] && [ -f "$BUNDLED_DATA/$f" ]; then
        echo "Copying $f to $DATA_DIR/"
        cp "$BUNDLED_DATA/$f" "$DATA_DIR/$f"
    fi
done

# Start gunicorn
exec gunicorn \
    --bind "0.0.0.0:${PORT:-5000}" \
    --workers 1 \
    --threads 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    app:app
