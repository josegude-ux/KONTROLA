#!/usr/bin/env python3
"""Integra el ZIP oficial de imagenes en un checkout de la rama de trabajo.
Uso: python scripts/integrar_menu_oficial.py /ruta/VISURA_PREPARA_INTEGRACION_MENU_LISTA.zip
No hace commits, merges, despliegues ni cambios en la base de datos.
"""
from pathlib import Path
from zipfile import ZipFile
import sys
import re

root = Path(__file__).resolve().parents[1]
if len(sys.argv) != 2:
    sys.exit("Uso: python scripts/integrar_menu_oficial.py /ruta/paquete.zip")
zip_path = Path(sys.argv[1]).expanduser().resolve()
mapping = {
    "openPreparation": ("kontrola-preparacion-3d.webp", "visura-prepara-preparacion-3d.webp"),
    "openReview": ("kontrola-verificacion-3d.webp", "visura-prepara-control-cargas-3d.webp"),
    "openCargas": ("kontrola-control-cargas-3d.webp", "visura-prepara-operaciones-3d.webp"),
    "openAdmin": ("kontrola-administracion-3d.webp", "visura-prepara-administracion-3d.webp"),
}
paths = ("index.html", "sw.js", "tests/visura-menu.test.mjs", "tests/navigation.test.mjs")
for path in paths:
    if not (root / path).is_file():
        sys.exit("Falta archivo del proyecto: " + path)
html, sw, tests, navigation = [(root / p).read_text(encoding="utf-8") for p in paths]
with ZipFile(zip_path) as archive:
    names = set(archive.namelist())
    files = {}
    for _, new in mapping.values():
        name = "assets/home/" + new
        if name not in names:
            sys.exit("Falta imagen oficial: " + name)
        data = archive.read(name)
        if len(data) > 2_000_000:
            sys.exit("WEBP demasiado grande: " + name)
        if not data.startswith(b"RIFF") or data[8:12] != b"WEBP":
            sys.exit("WEBP invalido: " + name)
        files[name] = data
    for name in names:
        if name.startswith("assets/home/originales/") and not name.endswith("/"):
            if Path(name).suffix.lower() not in (".png", ".jpeg", ".jpg"):
                sys.exit("Formato original inesperado: " + name)
            if len(archive.getinfo(name).filename) > 200 or Path(name).is_absolute() or ".." in Path(name).parts:
                sys.exit("Ruta de original insegura: " + name)
            files[name] = archive.read(name)
    if len([name for name in files if name.startswith("assets/home/originales/")]) != 4:
        sys.exit("El paquete debe contener cuatro imagenes originales")
for card, (old, new) in mapping.items():
    match = re.search(r'(<button id="' + card + r'"[\s\S]*?</button>)', html)
    if not match:
        sys.exit("No existe la tarjeta: " + card)
    block = match.group(1)
    if old not in block and new not in block:
        sys.exit("Referencia inesperada en " + card)
    html = html.replace(block, block.replace(old, new), 1)
    old_path = '"./assets/home/' + old + '"'
    new_path = '"./assets/home/' + new + '"'
    if old_path not in sw and new_path not in sw:
        sys.exit("Precarga desconocida: " + old)
    sw = sw.replace(old_path, new_path)
    if '"'+old+'"' not in tests and '"'+new+'"' not in tests:
        sys.exit("Test no reconoce imagen: " + old)
    tests = tests.replace('"'+old+'"', '"'+new+'"')
if "kontrola-integral-visura-v062" in navigation:
    navigation = navigation.replace("kontrola-integral-visura-v062", "kontrola-integral-visura-v063")
if "kontrola-integral-visura-v062" in sw:
    sw = sw.replace("kontrola-integral-visura-v062", "kontrola-integral-visura-v063")
elif "kontrola-integral-visura-v063" not in sw:
    sys.exit("Version de cache inesperada")
for name, data in files.items():
    dest = root / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
for path, value in zip(paths, (html, sw, tests, navigation)):
    (root / path).write_text(value, encoding="utf-8")
print("Imagenes oficiales integradas. Ejecutar: npm ci && npm run check")
print("Revisar git diff antes de cualquier commit. Sin merge ni despliegue.")
