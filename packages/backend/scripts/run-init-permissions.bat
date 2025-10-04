@echo off
cd /d "%~dp0.."
for /f "usebackq tokens=*" %%a in (".env") do set %%a
npx tsx scripts/init-permissions.ts
pause
