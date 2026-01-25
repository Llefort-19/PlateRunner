"""
Server lifecycle routes blueprint.
Handles server status and shutdown operations.
"""
import os
import sys
import threading
from flask import Blueprint, jsonify, request
from functools import wraps

# Create blueprint
lifecycle_bp = Blueprint('lifecycle', __name__, url_prefix='/api/server')

# Track server state
_shutdown_requested = False

def is_portable_mode():
    """Check if running as a portable executable."""
    return getattr(sys, 'frozen', False)

@lifecycle_bp.route('/status', methods=['GET'])
def get_status():
    """Get server status information."""
    return jsonify({
        'status': 'running',
        'portable_mode': is_portable_mode(),
        'shutdown_available': True,  # Always allow shutdown - helps prevent zombie servers
        'version': '1.0.0'
    }), 200

@lifecycle_bp.route('/shutdown', methods=['POST'])
def shutdown_server():
    """Shutdown the server gracefully."""
    global _shutdown_requested
    
    # Get optional delay parameter
    delay = request.json.get('delay', 1) if request.is_json else 1
    
    _shutdown_requested = True
    
    def shutdown_after_response():
        """Shutdown the server after a short delay."""
        import time
        time.sleep(delay)
        os._exit(0)
    
    # Start shutdown in background thread
    shutdown_thread = threading.Thread(target=shutdown_after_response, daemon=True)
    shutdown_thread.start()
    
    return jsonify({
        'status': 'shutting_down',
        'message': 'Server will shutdown in a moment. You can close this browser tab.'
    }), 200

@lifecycle_bp.route('/ping', methods=['GET'])
def ping():
    """Simple ping endpoint for health checks."""
    return jsonify({'pong': True}), 200
