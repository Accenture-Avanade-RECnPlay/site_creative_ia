
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("Chave da API não encontrada no .env")

client = genai.Client(api_key=api_key)

prompt = """
Crie uma peça publicitária genérica para redes sociais
de uma campanha fictícia de cuidados pessoais.
Produto ilustrativo: protetor solar.

Estilo moderno, cores vibrantes, composição profissional,
formato vertical para Instagram Stories.
Não use marcas reais nem preços.
"""

response = client.models.generate_content(
    model="gemini-3.1-flash-image",
    contents=[prompt],
)

image_saved = False

for part in response.parts:
    if part.inline_data is not None:
        image = part.as_image()
        image.save("campanha_teste.png")
        image_saved = True

if image_saved:
    print("Imagem salva em campanha_teste.png")
else:
    print("A API não retornou uma imagem.")
    print(response.text or "Nenhum texto retornado.")
