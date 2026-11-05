#!/usr/bin/env python3
"""Prueba aislada del integrador sin tocar archivos reales ni desplegar."""
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
import subprocess
import sys
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "scripts/integrar_menu_oficial.py"
MAPPING = [
    ("openPreparation", "kontrola-preparacion-3d.webp", "visura-prepara-preparacion-3d.webp"),
    ("openReview", "kontrola-verificacion-3d.webp", "visura-prepara-control-cargas-3d.webp"),
    ("openCargas", "kontrola-control-cargas-3d.webp", "visura-prepara-operaciones-3d.webp"),
    ("openAdmin", "kontrola-administracion-3d.webp", "visura-prepara-administracion-3d.webp"),
]
WEBP = b"RIFF" + (4).to_bytes(4, "little") + b"WEBP"

class IntegracionTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "scripts").mkdir()
        (self.root / "tests").mkdir()
        (self.root / "scripts/integrar_menu_oficial.py").write_bytes(SOURCE.read_bytes())
        html = "\n".join(f'<button id="{card}" type="button"><img src="./assets/home/{old}"></button>' for card, old, _ in MAPPING)
        sw = 'const CACHE="kontrola-integral-visura-v062";\nconst ASSETS=[' + ",".join(f'"./assets/home/{old}"' for _, old, _ in MAPPING) + '];'
        tests = "\n".join(f'const {card}="{old}";' for card, old, _ in MAPPING)
        for path, value in (("index.html", html), ("sw.js", sw), ("tests/visura-menu.test.mjs", tests)):
            (self.root / path).write_text(value, encoding="utf-8")
        self.zip = self.root / "imagenes.zip"

    def make_zip(self, originals=4, corrupt=False):
        with ZipFile(self.zip, "w") as z:
            for _, _, new in MAPPING:
                z.writestr("assets/home/" + new, b"invalid" if corrupt else WEBP)
            for i in range(originals):
                z.writestr(f"assets/home/originales/{i}.png", b"PNG")

    def run_script(self):
        return subprocess.run([sys.executable, str(self.root / "scripts/integrar_menu_oficial.py"), str(self.zip)], capture_output=True, text=True)

    def test_integracion_completa(self):
        self.make_zip()
        p = self.run_script()
        self.assertEqual(p.returncode, 0, p.stderr + p.stdout)
        html = (self.root / "index.html").read_text()
        sw = (self.root / "sw.js").read_text()
        self.assertIn("kontrola-integral-visura-v063", sw)
        for card, old, new in MAPPING:
            self.assertIn(new, html)
            self.assertIn(new, sw)
            self.assertNotIn(old, html)
            self.assertTrue((self.root / "assets/home" / new).is_file())
        self.assertEqual(self.run_script().returncode, 0, "La integracion debe ser idempotente")

    def test_rechaza_originales_incompletos_sin_cambiar_html(self):
        self.make_zip(originals=3)
        before = (self.root / "index.html").read_bytes()
        p = self.run_script()
        self.assertNotEqual(p.returncode, 0)
        self.assertEqual(before, (self.root / "index.html").read_bytes())

    def test_rechaza_webp_corrupto_sin_cambiar_html(self):
        self.make_zip(corrupt=True)
        before = (self.root / "index.html").read_bytes()
        p = self.run_script()
        self.assertNotEqual(p.returncode, 0)
        self.assertEqual(before, (self.root / "index.html").read_bytes())

if __name__ == "__main__":
    unittest.main()
