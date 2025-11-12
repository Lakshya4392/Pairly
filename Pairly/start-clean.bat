@echo off
echo Cleaning Metro cache...

REM Kill all node processes
taskkill /F /IM node.exe 2>nul

REM Delete Metro cache
rmdir /s /q .expo 2>nul
rmdir /s /q node_modules\.cache 2>nul
del metro-cache-* 2>nul

REM Delete temp folders
rmdir /s /q %TEMP%\metro-* 2>nul
rmdir /s /q %TEMP%\haste-map-* 2>nul
rmdir /s /q %LOCALAPPDATA%\Temp\metro-* 2>nul

echo Starting Expo with clean cache...
npx expo start --clear

pause
