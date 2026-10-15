import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.rotas import admin, cga, conta, cpd, diretoria, matriculas, professores, rh, secretaria

app = FastAPI(
    title="ponto.escolar API",
    description="API do ponto.escolar — gestão escolar da pontodevelop: secretaria, matrícula, "
    "portal do responsável, diretoria, professores, CPD, CGA e Meu RH.",
    version="0.2.0",
)

origens = os.getenv("CORS_ORIGINS", "http://localhost:3002").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origens if o.strip()],
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(conta.router)
app.include_router(admin.router)
app.include_router(secretaria.router)
app.include_router(matriculas.router)
app.include_router(diretoria.router)
app.include_router(rh.router)
app.include_router(professores.router)
app.include_router(cpd.router)
app.include_router(cga.router)
