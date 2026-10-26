"""Offline CSV preflight for manual warehouse exports.

Never uploads or mutates source data. Does not assume Business Central column names.
"""
import csv
from pathlib import Path


def inspect_csv(path, required_columns, *, max_bytes=20_000_000):
    """Return header/row diagnostics; reject missing or ambiguous columns."""
    source = Path(path)
    if source.stat().st_size > max_bytes:
        raise ValueError("File exceeds configured safety limit")
    required = tuple(required_columns)
    if not required or any(not isinstance(col, str) or not col.strip() for col in required):
        raise ValueError("Required columns must be nonempty strings")
    if len(set(required)) != len(required):
        raise ValueError("Duplicate required columns")
    with source.open("r", encoding="utf-8-sig", newline="") as stream:
        sample = stream.read(4096)
        stream.seek(0)
        if not sample.strip():
            raise ValueError("Empty CSV")
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        except csv.Error as exc:
            raise ValueError("Cannot identify CSV delimiter") from exc
        reader = csv.reader(stream, dialect)
        header = next(reader, [])
        if not header or any(not name.strip() for name in header):
            raise ValueError("Missing or blank header")
        if len(header) != len(set(header)):
            raise ValueError("Duplicate header columns")
        missing = [name for name in required if name not in header]
        if missing:
            raise ValueError("Missing columns: " + ", ".join(missing))
        count = 0
        for row in reader:
            if not row or not any(value.strip() for value in row):
                continue
            if len(row) != len(header):
                raise ValueError(f"Invalid field count on data row {count + 1}")
            count += 1
        return {"delimiter": dialect.delimiter, "columns": header, "rows": count}
