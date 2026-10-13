# Inicia o ambiente completo do ponto.escolar.
#
#   start_escolar            pergunta o modo
#   start_escolar local      API (uvicorn) e app (next dev) direto na máquina, com recarga automática
#   start_escolar docker     API e app em containers (docker compose), igual à produção
#
# Em qualquer modo, antes de subir, encerra o que o projeto deixou rodando:
# containers do compose e processos node/python nas portas 3002 e 8002.

param(
    [ValidateSet("", "local", "docker")]
    [string]$Modo = ""
)

$ErrorActionPreference = "Stop"

$Raiz = $PSScriptRoot
$Backend = Join-Path $Raiz "backend"
$Frontend = Join-Path $Raiz "frontend"
$Compose = Join-Path $Raiz "docker-compose.yml"
# Portas próprias: 3000/8000 (Intranet) e 3001/8001 (site pontodevelop) ficam livres
$PortaApi = 8002
$PortaApp = 3002
$DockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"

function Escrever($texto, $cor = "Cyan") { Write-Host "[escolar] $texto" -ForegroundColor $cor }

# ---------- Portas ----------

# Só encerra processos que o próprio projeto sobe (node = Next.js, python = API).
# Qualquer outro dono da porta (Docker de outro projeto, WSL, serviços do Windows) é preservado.
$ProcessosDoProjeto = @("node", "python", "pythonw", "uvicorn")

function Liberar-Porta($porta) {
    $ErrorActionPreference = "Continue"
    $conexoes = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue
    $pids = $conexoes | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 }
    if (-not $pids) {
        Escrever "Porta $porta livre." "DarkGray"
        return
    }
    foreach ($id in $pids) {
        $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
        if (-not $proc) { continue }
        if ($ProcessosDoProjeto -notcontains $proc.ProcessName.ToLower()) {
            Escrever "A porta $porta está em uso por '$($proc.ProcessName)' (PID $id), que não é deste projeto." "Red"
            Escrever "Encerre esse programa (ex.: container de outro projeto) ou libere a porta e rode o start_escolar de novo." "Red"
            exit 1
        }
        Escrever "Encerrando $($proc.ProcessName) (PID $id) na porta $porta..." "Yellow"
        # /T encerra também os processos filhos (ex.: next dev, uvicorn --reload)
        taskkill /PID $id /T /F 2>$null | Out-Null
    }
}

# ---------- Docker ----------

function Docker-Instalado { [bool](Get-Command docker -ErrorAction SilentlyContinue) }

function Docker-Ativo {
    $ErrorActionPreference = "Continue"
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

function Garantir-Docker {
    if (-not (Docker-Instalado)) {
        Escrever "Docker não encontrado. Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/" "Red"
        exit 1
    }
    if (Docker-Ativo) { return }

    if (-not (Test-Path $DockerDesktop)) {
        Escrever "O Docker está instalado, mas o serviço não está rodando. Abra o Docker Desktop e tente de novo." "Red"
        exit 1
    }
    Escrever "Iniciando o Docker Desktop (pode levar até 2 minutos)..."
    Start-Process $DockerDesktop
    for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Seconds 2
        if (Docker-Ativo) {
            Escrever "Docker pronto." "Green"
            return
        }
    }
    Escrever "O Docker não respondeu a tempo. Verifique o Docker Desktop e rode o start_escolar de novo." "Red"
    exit 1
}

function Parar-Containers {
    # Só verifica se o Docker já estiver rodando: no modo local não faz sentido ligá-lo.
    if (-not (Docker-Instalado) -or -not (Docker-Ativo)) { return }
    $ErrorActionPreference = "Continue"
    $ativos = docker compose -f $Compose ps -q 2>$null
    if ($ativos) {
        Escrever "Parando containers anteriores do projeto..." "Yellow"
        docker compose -f $Compose down --remove-orphans 2>&1 | Out-Null
    }
}

function Aguardar-App {
    Escrever "Aguardando o app ficar pronto..."
    for ($i = 0; $i -lt 90; $i++) {
        try {
            Invoke-WebRequest "http://localhost:$PortaApp" -UseBasicParsing -TimeoutSec 2 | Out-Null
            return $true
        } catch { Start-Sleep -Seconds 1 }
    }
    return $false
}

# ---------- Escolha do modo ----------

if (-not $Modo) {
    Write-Host ""
    Write-Host "  ponto.escolar - como deseja iniciar?" -ForegroundColor White
    Write-Host "    [1] Local   (desenvolvimento, recarrega ao salvar)"
    Write-Host "    [2] Docker  (containers, igual à produção)"
    Write-Host ""
    $escolha = Read-Host "  Opção [1]"
    $Modo = if ($escolha -eq "2") { "docker" } else { "local" }
}
Escrever "Modo: $Modo" "White"

# ---------- Encerrar execuções anteriores ----------

if ($Modo -eq "docker") { Garantir-Docker }
Parar-Containers
Escrever "Liberando portas $PortaApi e $PortaApp..."
Liberar-Porta $PortaApi
Liberar-Porta $PortaApp

# ---------- Modo Docker ----------

if ($Modo -eq "docker") {
    Escrever "Construindo e iniciando os containers (a primeira vez demora alguns minutos)..." "Green"
    $ErrorActionPreference = "Continue"
    docker compose -f $Compose up -d --build
    # Uma porta recém-liberada pode levar alguns segundos para o Docker conseguir usá-la.
    for ($t = 0; $t -lt 2 -and $LASTEXITCODE -ne 0; $t++) {
        Escrever "Tentando novamente em 5 segundos..." "Yellow"
        Start-Sleep -Seconds 5
        docker compose -f $Compose up -d --force-recreate
    }
    if ($LASTEXITCODE -ne 0) {
        Escrever "Falha ao subir os containers. Veja os erros acima." "Red"
        exit 1
    }
    $ErrorActionPreference = "Stop"

    if (Aguardar-App) { Start-Process "http://localhost:$PortaApp" }

    Escrever "Tudo no ar (Docker)!" "Green"
    Escrever "  App:  http://localhost:$PortaApp" "Green"
    Escrever "  API:  http://localhost:$PortaApi/docs" "Green"
    Escrever "Logs:  docker compose logs -f     Parar:  docker compose down" "DarkGray"
    exit 0
}

# ---------- Modo local ----------

$Python = Join-Path $Backend ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    Escrever "Criando ambiente virtual Python..."
    python -m venv (Join-Path $Backend ".venv")
}
Escrever "Instalando dependências do backend..."
& $Python -m pip install -q --disable-pip-version-check -r (Join-Path $Backend "requirements.txt")

if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Escrever "Instalando dependências do frontend (npm install)..."
    Push-Location $Frontend
    npm install
    Pop-Location
}

Escrever "Iniciando API em http://localhost:$PortaApi ..." "Green"
Start-Process powershell -WorkingDirectory $Backend -ArgumentList @(
    "-NoExit", "-Command",
    "`$host.UI.RawUI.WindowTitle = 'ponto.escolar - API'; & '$Python' -m uvicorn app.main:app --reload --port $PortaApi"
)

Escrever "Iniciando app em http://localhost:$PortaApp ..." "Green"
Start-Process powershell -WorkingDirectory $Frontend -ArgumentList @(
    "-NoExit", "-Command",
    "`$host.UI.RawUI.WindowTitle = 'ponto.escolar - App'; `$env:API_URL = 'http://localhost:$PortaApi'; npm run dev -- --port $PortaApp"
)

if (Aguardar-App) { Start-Process "http://localhost:$PortaApp" }

Escrever "Tudo no ar (local)!" "Green"
Escrever "  App:  http://localhost:$PortaApp" "Green"
Escrever "  API:  http://localhost:$PortaApi/docs" "Green"
Escrever "Para parar, feche as janelas 'ponto.escolar - API' e 'ponto.escolar - App' (ou rode o start_escolar de novo)." "DarkGray"
