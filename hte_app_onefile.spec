# -*- mode: python ; coding: utf-8 -*-
import os

block_cipher = None
base_path = os.path.dirname(os.path.abspath(SPEC))

# Data files to include
datas = [
    (os.path.join(base_path, 'frontend', 'build'), 'build'),
]
datas = [(src, dst) for src, dst in datas if os.path.exists(src)]

hiddenimports = [
    'pandas', 'pandas._libs.tslibs.base', 'openpyxl', 'openpyxl.cell._writer',
    'flask_cors', 'werkzeug.routing', 'werkzeug.security', 'jinja2',
    'markupsafe', 'email.mime.text', 'email.mime.multipart',
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
    excludes=['matplotlib', 'scipy', 'IPython', 'jupyter', 'notebook'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='HTE_App_Standalone',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(base_path, 'Logo_HTE_D2D.png') if os.path.exists(os.path.join(base_path, 'Logo_HTE_D2D.png')) else None,
)
