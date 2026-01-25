# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for HTE App.
Bundles the Flask backend with the React frontend build.
"""

import os

block_cipher = None

# Base path
base_path = os.path.dirname(os.path.abspath(SPEC))

# Data files to include
# NOTE: Excel files (Inventory.xlsx, Private_Inventory.xlsx, Solvent.xlsx) are NOT bundled!
# They should be placed in a 'data' folder next to the exe by the user.
# Only the React build folder is bundled.
datas = [
    # React build folder (bundled with the app)
    (os.path.join(base_path, 'frontend', 'build'), 'build'),
]

# Filter out non-existent files
datas = [(src, dst) for src, dst in datas if os.path.exists(src)]

# Hidden imports for pandas, openpyxl, and other dependencies
hiddenimports = [
    'pandas',
    'pandas._libs.tslibs.base',
    'openpyxl',
    'openpyxl.cell._writer',
    'flask_cors',
    'werkzeug.routing',
    'werkzeug.security',
    'jinja2',
    'markupsafe',
    'email.mime.text',
    'email.mime.multipart',
]

a = Analysis(
    ['hte_launcher.py'],
    pathex=[os.path.join(base_path, 'backend')],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Note: tkinter is now REQUIRED for the GUI launcher
        'matplotlib',
        'scipy',
        'IPython',
        'jupyter',
        'notebook',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='HTE_App',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Hide console - GUI launcher provides visual feedback
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(base_path, 'Logo_HTE_D2D.png') if os.path.exists(os.path.join(base_path, 'Logo_HTE_D2D.png')) else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='HTE_App',
)
