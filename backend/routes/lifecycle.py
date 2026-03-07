"""
Server lifecycle routes blueprint.
Handles server status and health check operations.
"""
from flask import Blueprint, jsonify

# Create blueprint
lifecycle_bp = Blueprint('lifecycle', __name__, url_prefix='/api/server')


@lifecycle_bp.route('/status', methods=['GET'])
def get_status():
    """Get server status information."""
    return jsonify({
        'status': 'running',
        'portable_mode': False,
        'shutdown_available': False,
        'version': '1.0.0'
    }), 200


@lifecycle_bp.route('/shutdown', methods=['POST'])
def shutdown_server():
    """Shutdown endpoint - disabled in web mode."""
    return jsonify({
        'error': 'Not available in web mode'
    }), 403


@lifecycle_bp.route('/ping', methods=['GET'])
def ping():
    """Simple ping endpoint for health checks."""
    return jsonify({'pong': True}), 200
