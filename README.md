# Creative IA
 
**Campanhas da Pague Menos, do briefing à peça pronta, com ajuda de IA.**
 
Projeto desenvolvido no hackathon Avanade / Pague Menos.
 
---
 
## O problema
 
Uma campanha da Pague Menos precisa virar várias peças: cada canal (Instagram, WhatsApp) e cada região (Pernambuco, São Paulo) pede imagem, tom e linguagem diferentes. Fazer isso na mão é lento, repetitivo e difícil de manter com a cara da marca.
 
## A solução
 
Você preenche um briefing e o Creative IA entrega:
 
1. **Dois conceitos criativos**, cada um com imagem gerada por IA e uma mensagem-chave.
2. **Quatro peças adaptadas** a partir do conceito escolhido: Instagram e WhatsApp, em PE e SP.
3. **Um editor com chat**, onde você pede ajustes em linguagem natural ("deixe mais curto", "foque em hidratação") e a IA reescreve o texto.
4. **Uma tela de revisão** para aprovar, pedir ajuste ou rejeitar cada peça.
## Equipe
 
| Integrante | Papel | Responsabilidade |
| --- | --- | --- |
| **Matheus Vaz** | Backend e Scrum Master | API em FastAPI, integração com as IAs de imagem e texto, organização do projeto e das entregas |
| **Mariana Kottas** | Frontend e Product Owner | Interface do site, fluxo das telas e definição do que o produto precisa entregar |
 
## Como o sistema funciona
 
```text
 Navegador (frontend)                 Servidor (backend)                Pollinations
 ────────────────────                 ──────────────────                ────────────
 Briefing preenchido  ──────────────▶ POST /api/campanhas  ───────────▶ gera a imagem
                                                           ───────────▶ gera os textos
 Conceitos e peças    ◀────────────── imagem + 4 textos
 Pedido de ajuste     ──────────────▶ POST /api/editar     ───────────▶ reescreve o texto
 Texto novo na tela   ◀────────────── título + texto
```
 
A chave da IA fica só no servidor, no arquivo `.env`. O navegador nunca a vê.
 
## Tecnologias
 
| Camada | O que usamos |
| --- | --- |
| Frontend | HTML, Tailwind CSS e JavaScript puro |
| Backend | Python, FastAPI, Uvicorn |
| IA | Pollinations (imagem e texto) |
 
## Estrutura de pastas
 
```text
Creative_IA/
├── .env                  chave da API (fica fora do Git)
├── .env.example          modelo do .env
├── requirements.txt      dependências do Python
├── backend/
│   ├── main.py           servidor, rotas e integração com a IA
│   ├── imagens/          imagens geradas
│   └── testes/           scripts soltos para testar as APIs
└── frontend/
    ├── index.html        aplicação completa (todas as telas)
    ├── assets/js/
    │   ├── api.js        conversa com o backend
    │   └── ui.js         botões, filtros e avisos da interface
    └── *.html            telas avulsas do protótipo original
```
 
## Como rodar
 
**1. Instale as dependências** (na pasta `Creative_IA`):
 
```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
```
 
**2. Coloque sua chave** no arquivo `.env`:
 
```text
POLLINATIONS_API_KEY=sua_chave_aqui
```
 
**3. Suba o servidor:**
 
```bash
python -m uvicorn backend.main:app --reload
```
 
**4. Abra** `http://127.0.0.1:8000`.
 
A documentação interativa da API fica em `http://127.0.0.1:8000/docs`.
 
> Se você mudar o `.env`, pare o servidor (Ctrl+C) e suba de novo. Ele só lê o arquivo na hora de iniciar.
 
## Rotas da API
 
| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/api/health` | Confere se o servidor está de pé e se a chave foi configurada |
| POST | `/api/campanhas` | Recebe o briefing e o conceito (`A` ou `B`) e devolve imagem, mensagem-chave e os textos das 4 peças |
| POST | `/api/editar` | Recebe o texto atual e uma instrução e devolve o texto reescrito |
 
## Configurações opcionais
 
No `.env`:
 
- `POLLINATIONS_IMAGE_MODEL`: modelo de imagem (padrão `z-image-turbo`)
- `POLLINATIONS_TEXT_MODEL`: modelo de texto (padrão `openai`)
## Estado atual e próximos passos
 
**Já funciona:** briefing, geração de conceitos com imagem, adaptação em 4 peças, edição por chat e navegação entre as telas.
 
**Ainda é demonstração:**
- Aprovar, pedir ajuste e rejeitar na tela de revisão só muda a tela, não salva nada.
- A biblioteca e o histórico mostram campanhas de exemplo.
**Próximos passos:**
- Salvar campanhas, versões e aprovações em um banco de dados.
- Permitir escolher outras regiões e canais.
- Aplicar o texto direto sobre a imagem para exportar a peça final.
## Observações técnicas
 
- Se a IA de texto não responder, o backend monta textos-modelo a partir do briefing. A resposta traz o campo `origem_texto` (`ia` ou `modelo`) para indicar de onde veio o texto.
- O ajuste por chat não tem texto-modelo: se a IA falhar, o chat mostra o erro.
- O script `backend/testes/teste_gemini.py` precisa de `pip install google-genai pillow` e da `GEMINI_API_KEY` no `.env`.
 
