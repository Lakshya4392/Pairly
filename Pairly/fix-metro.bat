@echo off
echo Cleaning Metro bundler cache...

echo Stopping Metro...
taskkill /F /IM node.exe 2>nul

echo Clearing Metro cache...
rmdir /s /q %TEMP%\react-native-* 2>nul
rmdir /s /q %TEMP%\metro-* 2>nul
rmdir /s /q %TEMP%\haste-* 2>nul

echo Clearing node_modules cache...
rmdir /s /q node_modules\.cache 2>nul

echo Cache cleared! Now run: npx expo start --clear
pause
