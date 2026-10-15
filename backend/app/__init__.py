import os

# Imagem "bomba" (poucos bytes, milhões de pixels) não pode derrubar a API ao ser aberta pelo
# OpenCV no CGA. 60 milhões de pixels cobre uma A4 escaneada a 600 dpi (~35 milhões).
# Precisa ser definido antes de o OpenCV ser importado, por isso fica aqui.
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(60_000_000))
