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

REM Create data folder in dist
echo Creating data folder...
if not exist "dist\HTE_App\data" (
    mkdir "dist\HTE_App\data"
)

REM Copy README to data folder
if exist "data\README.md" (
    copy "data\README.md" "dist\HTE_App\data\" > nul
)

REM Copy Excel files if they exist (optional - user can add their own)
if exist "Inventory.xlsx" (
    echo Copying Inventory.xlsx...
    copy "Inventory.xlsx" "dist\HTE_App\data\" > nul
)
if exist "Solvent.xlsx" (
    echo Copying Solvent.xlsx...
    copy "Solvent.xlsx" "dist\HTE_App\data\" > nul
)
if exist "Private_Inventory.xlsx" (
    echo Copying Private_Inventory.xlsx...
    copy "Private_Inventory.xlsx" "dist\HTE_App\data\" > nul
)

echo.
echo Output location: dist\HTE_App\
echo.
echo IMPORTANT: Data files location
echo   Excel files should be placed in: dist\HTE_App\data\
echo   - Inventory.xlsx
echo   - Private_Inventory.xlsx  
echo   - Solvent.xlsx
echo.
echo To run the app:
echo   1. Go to dist\HTE_App\
echo   2. Ensure Excel files are in the data\ subfolder
echo   3. Double-click HTE_App.exe
echo   4. Open http://localhost:5000 in your browser
echo.
pause
