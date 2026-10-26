@echo off
title TerraFlow India - Subsurface & Pipeline Intelligence
echo ========================================================
echo   Launching TerraFlow India Subsurface Digital Twin...
echo   Pan-India Critical Pipelines & Municipal Water Grids
echo   2-Factor OTP Verified Security & Chrome Live Alerts
echo ========================================================

where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting TerraFlow Python API Server...
    start "" python "%~dp0serve.py"
) else (
    echo Opening TerraFlow directly in default browser...
    start "" "%~dp0index.html"
)

exit
