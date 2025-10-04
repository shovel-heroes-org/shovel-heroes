@echo off
chcp 65001 > nul
cd /d "%~dp0.."
echo 執行 supply_donations 表遷移...
npx tsx scripts/run-supply-donations-migration.ts
pause
