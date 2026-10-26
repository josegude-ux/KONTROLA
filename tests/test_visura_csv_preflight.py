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

    def test_quoted_delimiter_in_header(self):
        self.write('"Pedido, interno";Cantidad\nA01;2\n')
        result = inspect_csv(self.path, ["Pedido, interno", "Cantidad"])
        self.assertEqual(result["delimiter"], ";")
        self.assertEqual(result["rows"], 1)

    def test_tab_separated(self):
        self.write("Pedido\tCantidad\nA01\t2\n")
        self.assertEqual(inspect_csv(self.path, ["Pedido", "Cantidad"])["delimiter"], "\t")

    def test_quoted_data_with_separator(self):
        self.write('Pedido;Nota\nA01;"Frágil; urgente"\n')
        self.assertEqual(inspect_csv(self.path, ["Pedido", "Nota"])["rows"], 1)

    def test_rejects_duplicate_required_columns(self):
        self.write("Pedido;Cantidad\nA01;2\n")
        with self.assertRaisesRegex(ValueError, "Duplicate required columns"):
            inspect_csv(self.path, ["Pedido", "Pedido"])

    def test_rejects_blank_required_columns(self):
        self.write("Pedido;Cantidad\nA01;2\n")
        with self.assertRaisesRegex(ValueError, "nonempty strings"):
            inspect_csv(self.path, [" "])

    def test_multiline_quoted_header(self):
        self.write('"Pedido\ninterno";Cantidad\nA01;2\n')
        result = inspect_csv(self.path, ["Pedido\ninterno", "Cantidad"])
        self.assertEqual(result["delimiter"], ";")
        self.assertEqual(result["rows"], 1)

    def test_malformed_quoted_data_is_validation_error(self):
        self.write('Pedido;Nota\nA01;"texto sin cerrar\n')
        with self.assertRaisesRegex(ValueError, "Malformed CSV data"):
            inspect_csv(self.path, ["Pedido", "Nota"])

    def test_multiline_quoted_data_row(self):
        self.write('Pedido;Nota\nA01;"primera línea\nsegunda línea"\n')
        result = inspect_csv(self.path, ["Pedido", "Nota"])
        self.assertEqual(result["rows"], 1)

    def test_windows_line_endings_and_blank_rows(self):
        self.write("Pedido;Cantidad\r\nA01;2\r\n\r\nA02;3\r\n")
        result = inspect_csv(self.path, ["Pedido", "Cantidad"])
        self.assertEqual(result["rows"], 2)
        self.assertEqual(result["delimiter"], ";")

    def test_long_quoted_header_over_4096_bytes(self):
        long_name = "P" * 5000
        self.write(f'"{long_name}";Cantidad\nA01;2\n')
        result = inspect_csv(self.path, [long_name, "Cantidad"])
        self.assertEqual(result["delimiter"], ";")
        self.assertEqual(result["rows"], 1)

    def test_size_limit(self):
        self.write("Pedido;Cantidad\nA01;2\n")
        with self.assertRaisesRegex(ValueError, "safety limit"):
            inspect_csv(self.path, ["Pedido"], max_bytes=5)


if __name__ == "__main__":
    unittest.main()
