@echo off
echo ========================================
echo NUCLEAR OPTION - Complete Clean Install
echo ========================================
echo.

echo Step 1: Killing ALL processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM watchman.exe 2>nul
taskkill /F /IM adb.exe 2>nul
taskkill /F /IM java.exe 2>nul
taskkill /F /IM gradle.exe 2>nul

timeout /t 5 /nobreak >nul

echo Step 2: Trying to delete node_modules...
rd /s /q node_modules 2>nul

echo If delete failed, trying alternative method...
if exist node_modules (
    echo Renaming node_modules to old...
    ren node_modules node_modules_old_%RANDOM%
)

timeout /t 2 /nobreak >nul

echo Step 3: Cleaning other folders...
rd /s /q .expo 2>nul
rd /s /q android 2>nul
rd /s /q ios 2>nul
del package-lock.json 2>nul

echo Step 4: Installing fresh...
call npm install --legacy-peer-deps

echo.
echo ========================================
echo DONE! Now run: npx expo start --clear
echo ========================================
pause
