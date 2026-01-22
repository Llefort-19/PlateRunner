@echo off
REM Build script for HTE App executable
REM Creates a standalone Windows executable using PyInstaller

echo ============================================
echo   HTE App - Build Executable
echo ============================================
echo.

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found at .venv
    echo Please create it first: python -m venv .venv
    pause
    exit /b 1
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Check if PyInstaller is installed
python -c "import PyInstaller" 2>nul
if errorlevel 1 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

REM Check if React build exists
if not exist "frontend\build\index.html" (
    echo.
    echo Building React frontend...
    echo.
    cd frontend
    call npm run build
    cd ..
    
    if not exist "frontend\build\index.html" (
        echo ERROR: React build failed!
        pause
        exit /b 1
    )
)

echo.
echo Building executable with PyInstaller...
echo This may take a few minutes...
echo.

REM Run PyInstaller
pyinstaller --clean --noconfirm hte_app.spec

if errorlevel 1 (
    echo.
    echo ERROR: PyInstaller build failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Build completed successfully!
echo ============================================
echo.
echo Output location: dist\HTE_App\
echo.
echo To run the app:
echo   1. Go to dist\HTE_App\
echo   2. Double-click HTE_App.exe
echo   3. Open http://localhost:5000 in your browser
echo.
pause
