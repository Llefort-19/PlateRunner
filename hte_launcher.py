"""
HTE App Launcher (Minimal)
This launcher starts the Flask server and opens the browser.
The web app itself provides the Exit functionality.
"""
import sys
import os
import webbrowser
import socket
import time

# Set up paths before importing Flask app
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    application_path = os.path.dirname(sys.executable)
    os.chdir(application_path)
    # Add the executable's directory to the Python path
    sys.path.insert(0, application_path)
    backend_path = os.path.join(sys._MEIPASS, 'backend')
else:
    # Running as script
    application_path = os.path.dirname(os.path.abspath(__file__))
    os.chdir(application_path)
    backend_path = os.path.join(application_path, 'backend')

sys.path.insert(0, backend_path)

def is_port_in_use(port):
    """Check if a port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def show_already_running_dialog():
    """Show a dialog if the app is already running."""
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        response = messagebox.askyesno(
            "HTE App Already Running",
            "HTE App appears to already be running on port 5000.\n\n"
            "Would you like to open the browser to the existing instance?\n\n"
            "To exit the app, use the 'Exit' button in the web interface."
        )
        root.destroy()
        return response
    except:
        print("HTE App is already running on port 5000")
        return True

def main():
    """Main entry point."""
    # Check if already running
    if is_port_in_use(5000):
        if show_already_running_dialog():
            webbrowser.open('http://localhost:5000')
        return
    
    # Print startup message
    print("=" * 60)
    print("  HTE App - High Throughput Experiment Design")
    print("=" * 60)
    print()
    print(f"Application directory: {application_path}")
    
    # Check for data files
    from config import get_config, ensure_data_folder_exists
    config = get_config()
    
    ensure_data_folder_exists()
    data_folder = config.DATA_FOLDER_PATH
    print(f"Data folder: {data_folder}")
    print()
    
    required_files = {
        'Inventory.xlsx': config.INVENTORY_PATH,
        'Private_Inventory.xlsx': config.PRIVATE_INVENTORY_PATH,
        'Solvent.xlsx': config.SOLVENT_PATH
    }
    
    for name, path in required_files.items():
        if os.path.exists(path):
            print(f"  [OK] {name} found")
        else:
            print(f"  [!] {name} not found")
    
    print()
    print("Starting server...")
    print("The web browser will open automatically.")
    print()
    print("To EXIT the app: Use the 'Exit' button in the web interface")
    print("                 or close this window.")
    print()
    
    # Open browser after a short delay
    def open_browser():
        time.sleep(1.5)
        webbrowser.open('http://localhost:5000')
    
    import threading
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Import and run the Flask app
    from app import create_app
    app = create_app()
    
    # Run the server (blocking)
    try:
        app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False, threaded=True)
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
    except Exception as e:
        print(f"\nServer error: {e}")

if __name__ == '__main__':
    main()
