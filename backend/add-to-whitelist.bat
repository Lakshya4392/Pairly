@echo off
echo.
echo ================================
echo   Pairly Whitelist Manager
echo ================================
echo.

cd /d "%~dp0"

npx ts-node src/scripts/addToWhitelist.ts

pause
