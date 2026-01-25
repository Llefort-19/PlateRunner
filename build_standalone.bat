@echo off
REM Build script for HTE App Standalone Executable (Single File)

echo ============================================
echo   HTE App - Build Standalone Executable
echo ============================================
echo.

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found at .venv
    pause
    exit /b 1
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Build React frontend
echo Building React frontend...
cd frontend
call npm run build
cd ..

if not exist "frontend\build\index.html" (
    echo ERROR: React build failed!
    pause
    exit /b 1
)

echo.
echo Building executable with PyInstaller...
pyinstaller --clean --noconfirm hte_app_onefile.spec

if errorlevel 1 (
    echo ERROR: PyInstaller build failed!
    pause
    exit /b 1
)

echo.
echo Organizing files...
if not exist "dist\Standalone_Distribution" mkdir "dist\Standalone_Distribution"
if not exist "dist\Standalone_Distribution\data" mkdir "dist\Standalone_Distribution\data"

copy "dist\HTE_App_Standalone.exe" "dist\Standalone_Distribution\" > nul
copy "Inventory.xlsx" "dist\Standalone_Distribution\data\" > nul
copy "Solvent.xlsx" "dist\Standalone_Distribution\data\" > nul
if exist "Private_Inventory.xlsx" copy "Private_Inventory.xlsx" "dist\Standalone_Distribution\data\" > nul
copy "data\README.md" "dist\Standalone_Distribution\data\" > nul

echo Creating README...
echo HTE App Standalone Version > "dist\Standalone_Distribution\README.txt"
echo ========================== >> "dist\Standalone_Distribution\README.txt"
echo. >> "dist\Standalone_Distribution\README.txt"
echo Keep 'HTE_App_Standalone.exe' and the 'data' folder together. >> "dist\Standalone_Distribution\README.txt"
echo Double-click to run. >> "dist\Standalone_Distribution\README.txt"

echo.
echo ============================================
echo   Build completed successfully!
echo   Output: dist\Standalone_Distribution\
echo ============================================
echo.
pause
