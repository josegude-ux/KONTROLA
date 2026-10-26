import tempfile
import unittest
from pathlib import Path

from scripts.visura_csv_preflight import inspect_csv


class CsvPreflightTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "export.csv"

    def write(self, text):
        self.path.write_text(text, encoding="utf-8")

    def test_semicolon_and_bom(self):
        self.write("\ufeffPedido;Cantidad\nA01;2\nA02;3\n")
        self.assertEqual(inspect_csv(self.path, ["Pedido", "Cantidad"])["rows"], 2)

    def test_missing_column(self):
        self.write("Pedido;Cantidad\nA01;2\n")
        with self.assertRaisesRegex(ValueError, "Missing columns"):
            inspect_csv(self.path, ["Almacen"])

    def test_duplicate_header(self):
        self.write("Pedido;Pedido\nA01;2\n")
        with self.assertRaisesRegex(ValueError, "Duplicate header"):
            inspect_csv(self.path, ["Pedido"])

    def test_inconsistent_row(self):
        self.write("Pedido;Cantidad\nA01;2;extra\n")
        with self.assertRaisesRegex(ValueError, "Invalid field count"):
            inspect_csv(self.path, ["Pedido"])

    def test_empty_file(self):
        self.write("")
        with self.assertRaisesRegex(ValueError, "Empty CSV"):
            inspect_csv(self.path, ["Pedido"])

    def test_size_limit(self):
        self.write("Pedido;Cantidad\nA01;2\n")
        with self.assertRaisesRegex(ValueError, "safety limit"):
            inspect_csv(self.path, ["Pedido"], max_bytes=5)


if __name__ == "__main__":
    unittest.main()
