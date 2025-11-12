@echo off
cls
echo ================================================
echo ULTIMATE FIX - Nuclear Option
echo ================================================
echo.

echo Step 1: Kill ALL processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM watchman.exe 2>nul
taskkill /F /IM adb.exe 2>nul
taskkill /F /IM java.exe 2>nul
timeout /t 3 /nobreak >nul

echo Step 2: Clean ALL caches...
rmdir /s /q .expo 2>nul
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q android\.gradle 2>nul
rmdir /s /q android\app\build 2>nul
del metro-cache-* /q 2>nul
del package-lock.json 2>nul

echo Step 3: Clean system temp...
rmdir /s /q "%TEMP%\metro-*" 2>nul
rmdir /s /q "%TEMP%\haste-map-*" 2>nul
rmdir /s /q "%TEMP%\react-*" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\metro-*" 2>nul
rmdir /s /q "%APPDATA%\npm-cache" 2>nul

echo Step 4: Reset watchman (if installed)...
watchman watch-del-all 2>nul

echo Step 5: Clean npm cache...
call npm cache clean --force

echo Step 6: Reinstall dependencies...
call npm install --legacy-peer-deps

echo.
echo ================================================
echo Step 7: Starting Expo...
echo ================================================
timeout /t 2 /nobreak >nul

call npx expo start --clear

pause
