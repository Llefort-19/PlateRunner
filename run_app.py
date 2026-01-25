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
    
    print("=" * 60)
    print("  HTE App - High Throughput Experiment Design")
    print("=" * 60)
    print()
    
    # Import config functions to handle data folder
    try:
        # Add backend to path first
        backend_path = os.path.join(base_path, 'backend')
        if os.path.exists(backend_path):
            sys.path.insert(0, backend_path)
        
        from config import get_data_folder_path, ensure_data_folder_exists, get_config
        
        # Ensure data folder exists
        ensure_data_folder_exists()
        
        # Get data folder path
        data_folder = get_data_folder_path()
        config = get_config()
        
        print(f"Application directory: {base_path}")
        print(f"Data folder: {data_folder}")
        print()
        
        # Check for required Excel files and display status
        excel_files = [
            ("Inventory.xlsx", config.INVENTORY_PATH),
            ("Private_Inventory.xlsx", config.PRIVATE_INVENTORY_PATH),
            ("Solvent.xlsx", config.SOLVENT_PATH),
        ]
        
        missing_files = []
        for name, path in excel_files:
            if os.path.exists(path):
                print(f"  [OK] {name} found")
            else:
                print(f"  [MISSING] {name} NOT FOUND")
                missing_files.append(name)
        
        print()
        
        if missing_files:
            print("NOTE: Some Excel files are missing!")
            print(f"Please place the following files in: {data_folder}")
            for f in missing_files:
                print(f"  - {f}")
            print()
        
    except Exception as e:
        print(f"Warning: Could not initialize data folder: {e}")
        print()
    
    print("Starting server...")
    print("Opening browser to http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    print()
    
    # Open browser in a separate thread
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Import and run the Flask app
    # Backend path was already added earlier
    from app import app
    
    # Run the Flask app (production mode, not debug)
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    main()
