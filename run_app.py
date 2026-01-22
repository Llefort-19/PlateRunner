"""
HTE App Launcher - Entry point for PyInstaller executable.
Starts the Flask server and opens the browser automatically.
"""
import os
import sys
import webbrowser
import threading
import time

def get_base_path():
    """Get the base path for the application (handles PyInstaller)."""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        return os.path.dirname(sys.executable)
    else:
        # Running as script
        return os.path.dirname(os.path.abspath(__file__))

def open_browser():
    """Open browser after a short delay to let server start."""
    time.sleep(1.5)
    webbrowser.open('http://localhost:5000')

def main():
    """Main entry point."""
    # Get the base path (exe directory for PyInstaller, script directory otherwise)
    base_path = get_base_path()
    
    # Change to the base directory for relative paths
    os.chdir(base_path)
    
    print("=" * 50)
    print("  HTE App - High Throughput Experiment Design")
    print("=" * 50)
    print()
    print(f"Starting server...")
    print(f"Data path: {base_path}")
    print()
    print("Opening browser to http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    print()
    
    # Open browser in a separate thread
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Import and run the Flask app
    # Add backend to path if running from source
    backend_path = os.path.join(base_path, 'backend')
    if os.path.exists(backend_path):
        sys.path.insert(0, backend_path)
    
    from app import app
    
    # Run the Flask app (production mode, not debug)
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    main()
