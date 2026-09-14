@echo off
title ToolsByDcx Isolated Browser Launcher

:: ============================================================================
:: ToolsByDcx Isolated Profile Launcher
:: Runs Chrome in a dedicated profile directory so personal Gmail sessions
:: never conflict with Google Flow and shared account cookie injection.
:: ============================================================================

:: 1. Locate Google Chrome
set "CHROME_BIN="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined CHROME_BIN if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not defined CHROME_BIN if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_BIN if exist "%PROGRAMFILES%\Google\Chrome\Application\chrome.exe" set "CHROME_BIN=%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"

if not defined CHROME_BIN (
    echo [ERROR] Google Chrome was not found on your system.
    echo Please install Google Chrome from https://www.google.com/chrome/
    pause
    exit /b 1
)

:: 2. Target configuration - Dedicated Isolated Tools Profile
set "PROFILE_DIR=%~dp0ToolsByDcxProfile"
set "TARGET_URL=https://toolsbydcx.com/"

:: 3. Launch Chrome with isolated profile
echo ===================================================
echo  Launching ToolsByDcx Dedicated Browser Profile...
echo  (Isolated environment - safe for Google Flow)
echo ===================================================
start "" "%CHROME_BIN%" --user-data-dir="%PROFILE_DIR%" --no-first-run --no-default-browser-check "%TARGET_URL%"
exit /b 0
