"""
Configuration module for HTE App backend.
Provides environment-driven configuration with sensible defaults.
"""
import os
import sys
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def get_exe_path():
    """Get the directory where the executable lives (for PyInstaller)."""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable - get the directory containing the exe
        return os.path.dirname(sys.executable)
    else:
        # Running as script - get the parent directory of backend
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_app_resources_path():
    """Get the path to bundled app resources (React build, etc.)."""
    if getattr(sys, 'frozen', False):
        # PyInstaller extracts bundled files to _MEIPASS temp directory
        return sys._MEIPASS
    else:
        # Running as script - same as exe path
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_data_folder_path():
    """Get the path to user data folder (Excel files, etc.).
    
    In frozen mode: looks for 'data' folder next to the exe.
    In development: uses the project root directory directly.
    """
    # Check environment variable first (useful for testing/custom paths)
    if os.environ.get('DATA_FOLDER_PATH'):
        return os.environ.get('DATA_FOLDER_PATH')
    
    exe_path = get_exe_path()
    
    if getattr(sys, 'frozen', False):
        # Frozen mode: data folder sits next to the executable
        return os.path.join(exe_path, 'data')
    else:
        # Development mode: use project root directly (no 'data' subfolder)
        return exe_path

def ensure_data_folder_exists():
    """Ensure the data folder exists and contains template files if needed."""
    data_folder = get_data_folder_path()
    
    # Only create 'data' folder structure in frozen mode
    if not getattr(sys, 'frozen', False):
        return True
    
    # Create data folder if it doesn't exist
    if not os.path.exists(data_folder):
        try:
            os.makedirs(data_folder)
            logger.debug(f"Created data folder: {data_folder}")
        except OSError as e:
            logger.warning(f"Warning: Could not create data folder: {e}")
            return False
    
    return True

class Config:
    """Base configuration class with common settings."""
    
    # Flask settings
    _secret = os.environ.get('SECRET_KEY')
    SECRET_KEY = _secret if _secret else 'dev-secret-key-change-in-production'
    _warn_secret = not bool(_secret)
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    TESTING = False
    
    # File upload settings
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 25 * 1024 * 1024))  # 25MB default
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.csv', '.sdf'}
    
    # CORS settings (wildcard only in dev; production overrides this)
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5000').split(',')
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    CORS_HEADERS = ['Content-Type', 'Authorization']
    
    # Data file paths - using function to handle PyInstaller
    # APP_RESOURCES_PATH: bundled resources (React build) - extracted to temp in frozen mode
    # DATA_FOLDER_PATH: user data files (Excel) - sits next to exe in frozen mode
    APP_RESOURCES_PATH = get_app_resources_path()
    DATA_FOLDER_PATH = get_data_folder_path()
    
    # Excel file paths - these are user-managed files
    INVENTORY_PATH = os.path.join(DATA_FOLDER_PATH, 'Inventory.xlsx')
    PRIVATE_INVENTORY_PATH = os.path.join(DATA_FOLDER_PATH, 'Private_Inventory.xlsx')
    SOLVENT_PATH = os.path.join(DATA_FOLDER_PATH, 'Solvent.xlsx')
    
    # RDKit settings
    RDKIT_ENABLED = os.environ.get('RDKIT_ENABLED', 'True').lower() == 'true'
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Cache settings
    CACHE_ENABLED = os.environ.get('CACHE_ENABLED', 'True').lower() == 'true'
    CACHE_TTL = int(os.environ.get('CACHE_TTL', 300))  # 5 minutes default
    
    # Pagination settings
    DEFAULT_PAGE_SIZE = int(os.environ.get('DEFAULT_PAGE_SIZE', 100))
    MAX_PAGE_SIZE = int(os.environ.get('MAX_PAGE_SIZE', 1000))
    
    # Validation settings
    VALIDATION_ENABLED = os.environ.get('VALIDATION_ENABLED', 'True').lower() == 'true'
    VALIDATION_STRICT = os.environ.get('VALIDATION_STRICT', 'False').lower() == 'true'
    VALIDATION_LOG_WARNINGS = os.environ.get('VALIDATION_LOG_WARNINGS', 'True').lower() == 'true'
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///hte_beta.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session settings
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    REMEMBER_COOKIE_HTTPONLY = True

    # Security settings
    RATE_LIMITING_ENABLED = os.environ.get('RATE_LIMITING_ENABLED', 'True').lower() == 'true'
    API_RATE_LIMIT = int(os.environ.get('API_RATE_LIMIT', 100))  # requests per minute
    API_RATE_WINDOW = int(os.environ.get('API_RATE_WINDOW', 60))  # seconds
    UPLOAD_RATE_LIMIT = int(os.environ.get('UPLOAD_RATE_LIMIT', 10))  # uploads per 5 min
    UPLOAD_RATE_WINDOW = int(os.environ.get('UPLOAD_RATE_WINDOW', 300))  # seconds
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration."""
        pass

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    LOG_LEVEL = 'DEBUG'
    # More lenient rate limits for development
    API_RATE_LIMIT = 1000  # 1000 requests per minute
    API_RATE_WINDOW = 60  # 1 minute
    UPLOAD_RATE_LIMIT = 50  # 50 uploads per 5 minutes
    UPLOAD_RATE_WINDOW = 300  # 5 minutes

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://yourdomain.com').split(',')
    LOG_LEVEL = 'WARNING'
    VALIDATION_STRICT = False  # Allow partial saves (auto-save sends incomplete forms)
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    DATA_FOLDER_PATH = os.environ.get('DATA_FOLDER_PATH', '/app/data')
    INVENTORY_PATH = os.path.join(os.environ.get('DATA_FOLDER_PATH', '/app/data'), 'Inventory.xlsx')
    PRIVATE_INVENTORY_PATH = os.path.join(os.environ.get('DATA_FOLDER_PATH', '/app/data'), 'Private_Inventory.xlsx')
    SOLVENT_PATH = os.path.join(os.environ.get('DATA_FOLDER_PATH', '/app/data'), 'Solvent.xlsx')

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    CORS_ORIGINS = ['http://localhost:3000']
    # Use test data paths
    DATA_ROOT_PATH = os.path.join(os.path.dirname(__file__), 'test_data')
    INVENTORY_PATH = os.path.join(DATA_ROOT_PATH, 'test_inventory.xlsx')
    PRIVATE_INVENTORY_PATH = os.path.join(DATA_ROOT_PATH, 'test_private_inventory.xlsx')
    SOLVENT_PATH = os.path.join(DATA_ROOT_PATH, 'test_solvent.xlsx')

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment."""
    config_name = os.environ.get('FLASK_ENV', 'default')
    return config.get(config_name, config['default'])
