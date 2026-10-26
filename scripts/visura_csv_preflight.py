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
        # Parse candidate headers with csv.reader so quoted delimiters do not count.
        # Prefer a unique header containing all required columns; otherwise choose
        # the uniquely widest parsed header for useful missing-column diagnostics.
        candidates = {}
        for delimiter in (",", ";", "\t"):
            try:
                parsed = next(csv.reader([sample.splitlines()[0]], delimiter=delimiter, strict=True))
            except (csv.Error, StopIteration):
                continue
            candidates[delimiter] = parsed
        matches = [d for d, columns in candidates.items()
                   if len(columns) > 1 and all(name in columns for name in required)]
        if len(matches) == 1:
            best = matches[0]
        elif len(matches) > 1:
            raise ValueError("Ambiguous CSV delimiter")
        else:
            widths = {d: len(columns) for d, columns in candidates.items()}
            widest = max(widths.values(), default=0)
            leaders = [d for d, width in widths.items() if width == widest]
            if widest < 2 or len(leaders) != 1:
                raise ValueError("Cannot identify CSV delimiter")
            best = leaders[0]
        reader = csv.reader(stream, delimiter=best, strict=True)
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
        return {"delimiter": best, "columns": header, "rows": count}
