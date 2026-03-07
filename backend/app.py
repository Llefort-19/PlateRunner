"""
Flask application factory for HTE App.
Creates and configures the Flask application with proper error handling and logging.
"""
import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from flask_login import current_user
from config import get_config, get_app_resources_path

def get_base_path():
    """Get the base path for the application (handles PyInstaller)."""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable - use _MEIPASS for bundled files
        return getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    else:
        # Running as script
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def create_app(config_name=None):
    """Create and configure Flask application."""
    # Get path to bundled app resources (React build)
    resources_path = get_app_resources_path()
    
    # In frozen mode, React build is in the resources path
    # In development, it's in frontend/build
    if getattr(sys, 'frozen', False):
        static_folder = os.path.join(resources_path, 'build')
    else:
        static_folder = os.path.join(resources_path, 'frontend', 'build')
    
    # Create Flask app with static folder configuration
    if os.path.exists(static_folder):
        app = Flask(__name__, 
                    static_folder=static_folder,
                    static_url_path='')
    else:
        app = Flask(__name__)
    
    # Load configuration
    config_class = get_config() if config_name is None else config_name
    app.config.from_object(config_class)

    # Warn if using the default insecure secret key
    if app.config.get('_warn_secret'):
        import warnings
        warnings.warn(
            "SECRET_KEY is not set — using insecure default. "
            "Set the SECRET_KEY environment variable before deploying.",
            stacklevel=2
        )

    # Initialize database
    from models import db
    db.init_app(app)
    with app.app_context():
        db.create_all()

    # Initialize auth
    from auth import auth_bp, login_manager
    login_manager.init_app(app)
    app.register_blueprint(auth_bp)

    # Initialize extensions
    CORS(app,
         origins=app.config['CORS_ORIGINS'],
         methods=app.config['CORS_METHODS'],
         allow_headers=app.config['CORS_HEADERS'])
    
    # Configure logging
    configure_logging(app)
    
    # Apply security measures
    apply_security_measures(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Import state management
    from state import load_inventory
    
    # Initialize inventory on startup
    with app.app_context():
        try:
            load_inventory()
            app.logger.info("Inventory loaded successfully")
        except Exception as e:
            app.logger.warning(f"Failed to load inventory: {e}")
    
    # Add routes for serving React app (only if static folder exists)
    if app.static_folder and os.path.exists(app.static_folder):
        @app.route('/')
        def serve_react():
            """Serve React app."""
            return send_from_directory(app.static_folder, 'index.html')
        
        @app.errorhandler(404)
        def not_found_handler(e):
            """Handle 404 by serving React app for client-side routing."""
            # If it's an API request, return JSON error
            if request.path.startswith('/api/'):
                return jsonify({
                    'error': 'Not Found',
                    'message': 'The requested resource was not found',
                    'status_code': 404
                }), 404
            # Otherwise serve React app for client-side routing
            return send_from_directory(app.static_folder, 'index.html')
    
    return app

def configure_logging(app):
    """Configure application logging."""
    if not app.debug and not app.testing:
        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        # File handler with rotation
        file_handler = RotatingFileHandler('logs/hte_app.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('HTE App startup')

def apply_security_measures(app):
    """Apply security measures to the application."""
    from security.headers import add_security_headers
    from security.rate_limiting import apply_rate_limits

    # Exempt routes that don't require authentication
    _AUTH_EXEMPT = {
        '/api/auth/login',
        '/api/auth/register',
        '/api/server/ping',
        '/api/server/status',
    }

    @app.before_request
    def require_auth():
        """Enforce authentication on all /api/ routes except exempt ones."""
        from flask import request, jsonify, g
        if request.path.startswith('/api/') and request.path not in _AUTH_EXEMPT:
            if not current_user.is_authenticated:
                return jsonify({'error': 'Authentication required'}), 401
            g.current_user_id = current_user.id

    # Add security headers to all responses
    @app.after_request
    def security_headers(response):
        return add_security_headers(response)

    @app.after_request
    def save_experiment_state(response):
        """Persist experiment state to DB if modified during this request."""
        try:
            from state.experiment import save_experiment_if_dirty
            save_experiment_if_dirty()
        except Exception:
            pass  # Never let state save failure break a response
        return response

    # Apply rate limiting to all requests
    @app.before_request
    def rate_limiting():
        return apply_rate_limits()

def register_blueprints(app):
    """Register all blueprints with the application."""
    from routes.inventory import inventory_bp
    from routes.experiment import experiment_bp
    from routes.solvent import solvent_bp
    from routes.molecules import molecules_bp
    from routes.kit import kit_bp
    from routes.uploads import uploads_bp
    from routes.export import export_bp
    from routes.experiment_import import import_bp
    from routes.lifecycle import lifecycle_bp
    from routes.plating_protocol import plating_protocol_bp

    app.register_blueprint(inventory_bp)
    app.register_blueprint(experiment_bp)
    app.register_blueprint(solvent_bp)
    app.register_blueprint(molecules_bp)
    app.register_blueprint(kit_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(import_bp)
    app.register_blueprint(lifecycle_bp)
    app.register_blueprint(plating_protocol_bp)

def register_error_handlers(app):
    """Register error handlers for consistent error responses."""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle bad request errors."""
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid request',
            'status_code': 400
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle not found errors."""
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'status_code': 404
        }), 404
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        """Handle file too large errors."""
        return jsonify({
            'error': 'File Too Large',
            'message': f'File size exceeds maximum allowed size of {app.config["MAX_CONTENT_LENGTH"]} bytes',
            'status_code': 413
        }), 413
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle internal server errors."""
        app.logger.error(f'Internal server error: {error}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle all unhandled exceptions."""
        app.logger.error(f'Unhandled exception: {e}', exc_info=True)
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500
        }), 500

# Create the application instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'], port=5000)
