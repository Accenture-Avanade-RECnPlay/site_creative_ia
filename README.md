# Creative IA — Hackathon Avanade / Pague Menos

Plataforma para criar campanhas publicitárias da Pague Menos com IA: o usuário preenche o briefing, a IA propõe dois conceitos criativos com imagem e textos, adapta as peças por região e canal e permite ajustar cada texto por chat.

## Como funciona

1. **Briefing** — o formulário do site é enviado ao backend.
2. **Conceitos** — o backend gera uma imagem (Pollinations) e os textos de cada peça para os conceitos A e B.
3. **Adaptações** — o conceito escolhido vira 4 peças: Instagram e WhatsApp, em Pernambuco e São Paulo.
4. **Editor** — as instruções digitadas (ou os botões rápidos) reescrevem o texto da peça com IA.

A chave da API fica só no backend, no arquivo `.env`. Nada de chave no HTML.

## Estrutura

```text
Creative_IA/
├── .env                 sua chave (não vai para o Git)
├── .env.example         modelo do .env
├── requirements.txt
├── backend/
│   ├── main.py          API FastAPI + serve o site
│   ├── imagens/         imagens geradas
│   └── testes/          scripts soltos de teste (Gemini e Pollinations)
└── frontend/
    ├── index.html       site da Mariana, já integrado ao backend
    ├── assets/js/api.js chamadas à API (substitui as simulações)
    └── *.html           demais telas originais
```

## Como rodar

Na pasta `Creative_IA`:

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
```

Abra o arquivo `.env` e troque `sua_chave_aqui` pela sua chave da Pollinations:

```text
POLLINATIONS_API_KEY=sua_chave_aqui
```

Suba o servidor:

```bash
python -m uvicorn backend.main:app --reload
```

Abra `http://127.0.0.1:8000`. A documentação interativa da API fica em `http://127.0.0.1:8000/docs`.

## Rotas da API

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/api/health` | Mostra se o servidor está de pé e se a chave está configurada |
| POST | `/api/campanhas` | Recebe o briefing e o conceito (`A` ou `B`), devolve imagem, mensagem-chave e os textos das 4 peças |
| POST | `/api/editar` | Recebe o texto atual e uma instrução, devolve o texto reescrito |

## Configurações opcionais (`.env`)

- `POLLINATIONS_IMAGE_MODEL` — modelo de imagem (padrão `z-image-turbo`)
- `POLLINATIONS_TEXT_MODEL` — modelo de texto (padrão `openai`)

## Observações

- Se a IA de texto não responder, `/api/campanhas` usa textos-modelo montados a partir do briefing (campo `origem_texto` = `modelo`). A imagem sempre vem da IA.
- O ajuste por chat não tem texto-modelo: se a IA falhar, o chat avisa o erro.
- Telas de revisão, biblioteca e histórico ainda são demonstrativas. Persistir campanhas e aprovações é o próximo passo.
- As outras páginas HTML (`briefing.html`, `editor.html` etc.) são as telas avulsas originais e não estão conectadas à API. O fluxo completo está no `index.html`.
- Para o teste do Gemini (`backend/testes/teste_gemini.py`): `pip install google-genai pillow` e `GEMINI_API_KEY` no `.env`.
