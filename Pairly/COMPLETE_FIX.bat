@echo off
cls
echo ================================================
echo COMPLETE METRO CACHE FIX + CLEAN START
echo ================================================
echo.

echo [1/6] Killing all Node processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM watchman.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/6] Cleaning Expo cache...
rmdir /s /q .expo 2>nul

echo [3/6] Cleaning Metro cache...
rmdir /s /q node_modules\.cache 2>nul
del metro-cache-* /q 2>nul

echo [4/6] Cleaning Windows temp Metro files...
rmdir /s /q "%TEMP%\metro-*" 2>nul
rmdir /s /q "%TEMP%\haste-map-*" 2>nul
rmdir /s /q "%TEMP%\react-*" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\metro-*" 2>nul

echo [5/6] Cleaning npm cache...
call npm cache clean --force

echo [6/6] Starting Expo with clean cache...
echo.
echo ================================================
echo Starting in 3 seconds...
echo ================================================
timeout /t 3 /nobreak >nul

call npx expo start --clear

pause
