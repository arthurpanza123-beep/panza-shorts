@echo off
cd /d "%~dp0"
git add .
git commit -m "Atualizacao do site"
git push origin main
echo Site atualizado com sucesso: https://arthurpanza123-beep.github.io/panza-shorts/
pause
