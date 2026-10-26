import json
import os
import threading
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

RAIZ = Path(__file__).resolve().parent.parent
PASTA_FRONTEND = RAIZ / "frontend"
PASTA_IMAGENS = Path(__file__).resolve().parent / "imagens"
PASTA_IMAGENS.mkdir(exist_ok=True)

load_dotenv(RAIZ / ".env")

API_KEY = os.getenv("POLLINATIONS_API_KEY", "")
MODELO_IMAGEM = os.getenv("POLLINATIONS_IMAGE_MODEL", "z-image-turbo")
MODELO_TEXTO = os.getenv("POLLINATIONS_TEXT_MODEL", "openai")

TRAVA_IMAGEM = threading.Lock()

URL_IMAGEM = "https://gen.pollinations.ai/image/"
URL_TEXTO = "https://gen.pollinations.ai/v1/chat/completions"

CONCEITOS = {
    "A": {
        "titulo": "Verão sem Complicação",
        "descricao": (
            "Foco na rotina prática, leveza e acessibilidade. Mostra que cuidar da pele "
            "no calor extremo não precisa ser um ritual complexo ou caro."
        ),
        "direcao_visual": "sunny, joyful, family-friendly, beach atmosphere, warm golden light",
    },
    "B": {
        "titulo": "Seu Cuidado Vai com Você",
        "descricao": (
            "Conceito dinâmico focado em mobilidade, kits de viagem e proteção em movimento "
            "para quem está viajando ou na correria urbana."
        ),
        "direcao_visual": "dynamic, urban, active lifestyle, travel kit, city light, modern",
    },
}

PECAS = [
    ("instagram_pe", "Instagram", "Pernambuco"),
    ("whatsapp_pe", "WhatsApp", "Pernambuco"),
    ("instagram_sp", "Instagram", "São Paulo"),
    ("whatsapp_sp", "WhatsApp", "São Paulo"),
]

app = FastAPI(
    title="Creative IA - Pague Menos",
    description="Backend do Creative Hub: gera imagens e textos de campanha com IA.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Briefing(BaseModel):
    nome: str = Field(min_length=1)
    objetivo: str = ""
    tom: str = ""
    produtos: str = ""
    publico: str = ""
    regioes: list[str] = ["Pernambuco", "São Paulo"]
    canais: list[str] = ["Instagram", "WhatsApp"]


class PedidoCampanha(BaseModel):
    briefing: Briefing
    conceito: str = "A"


class PedidoEdicao(BaseModel):
    instrucao: str = Field(min_length=1)
    titulo_atual: str = ""
    texto_atual: str
    canal: str = ""
    regiao: str = ""
    produtos: str = ""
    tom: str = ""


def exigir_chave():
    if not API_KEY or API_KEY == "sua_chave_aqui":
        raise HTTPException(
            status_code=500,
            detail="Chave da Pollinations não configurada. Preencha POLLINATIONS_API_KEY no arquivo .env.",
        )


def pedir_imagem(prompt: str) -> tuple[bytes, str]:
    url = (
        f"{URL_IMAGEM}{urllib.parse.quote(prompt)}"
        f"?model={MODELO_IMAGEM}&width=1024&height=1024"
    )
    requisicao = urllib.request.Request(url, headers={"Authorization": f"Bearer {API_KEY}"})
    try:
        with TRAVA_IMAGEM:
            with urllib.request.urlopen(requisicao, timeout=120) as resposta:
                tipo = resposta.headers.get("Content-Type", "image/png")
                return resposta.read(), tipo
    except HTTPError as erro:
        corpo = erro.read().decode("utf-8", errors="replace")[:300]
        print(f"Erro da API de imagens: HTTP {erro.code} - {corpo}")
        raise HTTPException(status_code=502, detail=f"Erro da API de imagens: HTTP {erro.code}. {corpo}")
    except (URLError, TimeoutError) as erro:
        print(f"Falha de conexão com a API de imagens: {erro}")
        raise HTTPException(status_code=502, detail=f"Não foi possível conectar à API de imagens: {erro}")


def pedir_texto(sistema: str, usuario: str) -> str:
    corpo = json.dumps(
        {
            "model": MODELO_TEXTO,
            "messages": [
                {"role": "system", "content": sistema},
                {"role": "user", "content": usuario},
            ],
        }
    ).encode("utf-8")
    requisicao = urllib.request.Request(
        URL_TEXTO,
        data=corpo,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(requisicao, timeout=90) as resposta:
        dados = json.loads(resposta.read().decode("utf-8"))
    return dados["choices"][0]["message"]["content"]


def extrair_json(texto: str) -> dict:
    inicio = texto.find("{")
    fim = texto.rfind("}")
    if inicio == -1 or fim == -1:
        raise ValueError("Resposta sem JSON")
    return json.loads(texto[inicio : fim + 1])


def montar_prompt_imagem(briefing: Briefing, conceito: dict) -> str:
    return (
        "Create a fictional pharmacy advertising image. "
        f"Campaign theme: {briefing.nome}. "
        f"Products shown: {briefing.produtos or 'pharmacy and skincare products'}. "
        f"Target audience: {briefing.publico or 'general public'}. "
        f"Campaign objective: {briefing.objetivo or 'brand awareness'}. "
        f"Visual direction: {conceito['direcao_visual']}. "
        "Professional composition, attractive colors, "
        "no logos, no readable text, no fake product labels. "
        "Leave clear space for text to be added later."
    )


def textos_padrao(briefing: Briefing, conceito: dict) -> dict:
    produtos = briefing.produtos or "os produtos da campanha"
    pecas = {
        "instagram_pe": {
            "titulo": f"{briefing.nome}: sol forte pede cuidado ☀️",
            "texto": f"Aproveite o litoral pernambucano com {produtos}. Passe na Pague Menos.",
        },
        "whatsapp_pe": {
            "titulo": "Oi, Recife e região! 🌊",
            "texto": f"Vai curtir a praia? Garanta {produtos} na Pague Menos mais próxima.",
        },
        "instagram_sp": {
            "titulo": f"{briefing.nome}: no ritmo de SP 🧴",
            "texto": f"Cuidado prático para o dia a dia da cidade com {produtos}. Veja na Pague Menos.",
        },
        "whatsapp_sp": {
            "titulo": "Sem tempo a perder? ⚡",
            "texto": f"Peça {produtos} pelo WhatsApp e retire na Pague Menos mais próxima.",
        },
    }
    return {
        "mensagem_chave": f"{conceito['titulo']}: {briefing.nome}.",
        "pecas": pecas,
    }


def gerar_textos(briefing: Briefing, conceito: dict) -> tuple[dict, str]:
    sistema = (
        "Você é redator publicitário da rede de farmácias Pague Menos. "
        "Escreva em português do Brasil, com tom adequado e linguagem regional leve. "
        "Não invente preços, cupons, descontos nem alegações médicas. "
        "Responda somente com JSON válido, sem texto fora do JSON."
    )
    usuario = (
        f"Campanha: {briefing.nome}\n"
        f"Objetivo: {briefing.objetivo}\n"
        f"Tom de voz: {briefing.tom}\n"
        f"Produtos: {briefing.produtos}\n"
        f"Público: {briefing.publico}\n"
        f"Conceito: {conceito['titulo']} - {conceito['descricao']}\n\n"
        "Devolva este JSON:\n"
        '{"mensagem_chave": "frase curta do conceito", "pecas": {'
        '"instagram_pe": {"titulo": "...", "texto": "até 200 caracteres"}, '
        '"whatsapp_pe": {"titulo": "...", "texto": "até 220 caracteres"}, '
        '"instagram_sp": {"titulo": "...", "texto": "até 200 caracteres"}, '
        '"whatsapp_sp": {"titulo": "...", "texto": "até 220 caracteres"}}}\n'
        "Pernambuco: clima de praia e litoral. São Paulo: rotina urbana e praticidade."
    )
    try:
        dados = extrair_json(pedir_texto(sistema, usuario))
        for chave, _, _ in PECAS:
            if not dados["pecas"][chave]["titulo"] or not dados["pecas"][chave]["texto"]:
                raise ValueError("Peça incompleta")
        if not dados["mensagem_chave"]:
            raise ValueError("Mensagem-chave vazia")
        return dados, "ia"
    except (HTTPError, URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError):
        return textos_padrao(briefing, conceito), "modelo"


@app.get("/api/health")
def saude():
    return {
        "status": "ok",
        "pollinations_configurada": bool(API_KEY and API_KEY != "sua_chave_aqui"),
    }


@app.post("/api/campanhas")
def criar_campanha(pedido: PedidoCampanha):
    exigir_chave()
    conceito = CONCEITOS.get(pedido.conceito.upper())
    if conceito is None:
        raise HTTPException(status_code=422, detail="Conceito inválido. Use A ou B.")

    dados_imagem, tipo = pedir_imagem(montar_prompt_imagem(pedido.briefing, conceito))
    extensao = "jpg" if "jpeg" in tipo else "webp" if "webp" in tipo else "png"
    nome_arquivo = f"campanha_{uuid.uuid4().hex}.{extensao}"
    (PASTA_IMAGENS / nome_arquivo).write_bytes(dados_imagem)

    textos, origem = gerar_textos(pedido.briefing, conceito)

    return {
        "conceito": pedido.conceito.upper(),
        "titulo": conceito["titulo"],
        "descricao": conceito["descricao"],
        "mensagem_chave": textos["mensagem_chave"],
        "imagem_url": f"/imagens/{nome_arquivo}",
        "origem_texto": origem,
        "pecas": [
            {
                "id": chave,
                "canal": canal,
                "regiao": regiao,
                "titulo": textos["pecas"][chave]["titulo"],
                "texto": textos["pecas"][chave]["texto"],
            }
            for chave, canal, regiao in PECAS
        ],
    }


@app.post("/api/editar")
def editar_texto(pedido: PedidoEdicao):
    exigir_chave()
    sistema = (
        "Você edita textos publicitários da rede de farmácias Pague Menos, em português do Brasil. "
        "Aplique a instrução do usuário ao texto atual. Não invente preços, cupons, descontos "
        "nem alegações médicas. Responda somente com JSON válido, sem texto fora do JSON."
    )
    usuario = (
        f"Canal: {pedido.canal}\nRegião: {pedido.regiao}\n"
        f"Produtos: {pedido.produtos}\nTom de voz: {pedido.tom}\n\n"
        f"Título atual: {pedido.titulo_atual}\nTexto atual: {pedido.texto_atual}\n\n"
        f"Instrução: {pedido.instrucao}\n\n"
        'Devolva: {"titulo": "...", "texto": "...", "resumo": "uma frase dizendo o que mudou"}'
    )
    try:
        dados = extrair_json(pedir_texto(sistema, usuario))
        return {
            "titulo": dados.get("titulo") or pedido.titulo_atual,
            "texto": dados["texto"],
            "resumo": dados.get("resumo", "Texto ajustado."),
        }
    except (HTTPError, URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError):
        raise HTTPException(
            status_code=502,
            detail="A IA de texto não respondeu como esperado. Tente novamente.",
        )


app.mount("/imagens", StaticFiles(directory=str(PASTA_IMAGENS)), name="imagens")
app.mount("/", StaticFiles(directory=str(PASTA_FRONTEND), html=True), name="frontend")
