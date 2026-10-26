
import os
import urllib.parse
import urllib.request
from urllib.error import HTTPError
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("POLLINATIONS_API_KEY")

if not api_key or api_key == "sua_chave_aqui":
    raise ValueError("Confira a chave POLLINATIONS_API_KEY no arquivo .env")

prompt = (
    "A clean and professional fictional pharmacy campaign, "
    "summer theme, colorful background, sunscreen and skincare products, "
    "no logos, no readable text, advertising photography"
)

prompt_encoded = urllib.parse.quote(prompt)

url = (
    "https://gen.pollinations.ai/image/"
    f"{prompt_encoded}?model=z-image-turbo&width=1024&height=1024"
)

request = urllib.request.Request(
    url,
    headers={"Authorization": f"Bearer {api_key}"}
)

try:
    print("Solicitando uma imagem...")
    with urllib.request.urlopen(request, timeout=120) as response:
        image_data = response.read()

    with open("imagem_teste.png", "wb") as file:
        file.write(image_data)

    print("Imagem salva como imagem_teste.png")

except HTTPError as error:
    print(f"Erro HTTP: {error.code}")
    print(error.read().decode("utf-8", errors="replace")[:1000])
