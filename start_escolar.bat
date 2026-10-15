@echo off
rem Inicia todo o ambiente do ponto.escolar (duplo clique).
rem Uso: start_escolar            pergunta o modo
rem      start_escolar dev        containers que recarregam ao salvar (padrao)
rem      start_escolar local      API e app direto na maquina
rem      start_escolar docker     API e app em containers
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_escolar.ps1" %*
pause
