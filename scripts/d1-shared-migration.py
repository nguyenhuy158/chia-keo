import argparse
import hashlib
import json
import pathlib
import re
import sqlite3


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def tables(database):
    return [row[0] for row in database.execute(
        "SELECT name FROM sqlite_schema WHERE type='table' "
        "AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV' ORDER BY name"
    )]


def fingerprint(database, name):
    columns = [row[1] for row in database.execute(f"PRAGMA table_info({quote(name)})")]
    hashes = sorted(hashlib.sha256(json.dumps(
        row, ensure_ascii=False, default=lambda value: {"hex": value.hex()},
        separators=(",", ":"),
    ).encode()).hexdigest() for row in database.execute(f"SELECT * FROM {quote(name)}"))
    return {"columns": columns, "rows": len(hashes),
            "sha256": hashlib.sha256("\n".join(hashes).encode()).hexdigest()}


def restore(path):
    database = sqlite3.connect(":memory:")
    database.executescript(path.read_text())
    if database.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise ValueError("Database integrity check failed")
    if database.execute("PRAGMA foreign_key_check").fetchall():
        raise ValueError("Database has foreign key violations")
    return database


def prepare(source, output):
    database = restore(source)
    names = tables(database)
    if database.execute("SELECT 1 FROM sqlite_schema WHERE type IN ('view','trigger')").fetchone():
        raise ValueError("Views and triggers require an explicit migration")
    if any(name.startswith("chiakeo_") for name in names):
        raise ValueError("Source already contains prefixed tables")
    mapping = {name: "chiakeo_" + ("legacy_migrations" if name == "d1_migrations" else name)
               for name in names}
    before = {name: fingerprint(database, name) for name in names}
    for old, new in mapping.items():
        database.execute(f"ALTER TABLE {quote(old)} RENAME TO {quote(new)}")
    indexes = database.execute(
        "SELECT name,sql FROM sqlite_schema WHERE type='index' AND sql IS NOT NULL"
    ).fetchall()
    for name, sql in indexes:
        rewritten, count = re.subn(
            r'^(CREATE\s+(?:UNIQUE\s+)?INDEX\s+)(?:"[^"]+"|`[^`]+`|\[[^]]+\]|\S+)',
            lambda match: match[1] + quote("chiakeo_" + name), sql, count=1, flags=re.I,
        )
        if count != 1:
            raise ValueError("Unrecognized index definition")
        database.execute(f"DROP INDEX {quote(name)}")
        database.execute(rewritten)
    for old, new in mapping.items():
        if fingerprint(database, new) != before[old]:
            raise ValueError("Data changed during rename")
    if database.execute("PRAGMA foreign_key_check").fetchall():
        raise ValueError("Renamed foreign keys are invalid")
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    schema = [row[0] for row in database.execute(
        "SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND type IN ('table','index') "
        "AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV' "
        "ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name"
    )]
    (output / "schema.sql").write_text(";\n--> statement-breakpoint\n".join(schema) + ";\n")
    pending = {name: {row[2] for row in database.execute(f"PRAGMA foreign_key_list({quote(name)})")
                      if row[2] != name} for name in mapping.values()}
    ordered = []
    while pending:
        ready = sorted(name for name, parents in pending.items() if not parents.intersection(pending))
        if not ready:
            raise ValueError("Cyclic foreign keys require an explicit import strategy")
        ordered.extend(ready)
        for name in ready:
            del pending[name]
    statements = [line for line in database.iterdump() if line.startswith('INSERT INTO "chiakeo_')]
    positions = {name: position for position, name in enumerate(ordered)}
    statements.sort(key=lambda line: positions[line.split('"', 2)[1]])
    (output / "data.sql").write_text("PRAGMA defer_foreign_keys=ON;\n" + "\n".join(statements) + "\n")
    (output / "manifest.json").write_text(json.dumps(
        {"mapping": mapping, "tables": before}, indent=2,
    ) + "\n")
    check = sqlite3.connect(":memory:", isolation_level=None)
    check.execute("PRAGMA foreign_keys=ON")
    check.executescript((output / "schema.sql").read_text())
    for statement in statements:
        check.execute(statement)
    for old, new in mapping.items():
        if fingerprint(check, new) != before[old]:
            raise ValueError("Transformed dump restore did not match source")
    if check.execute("PRAGMA foreign_key_check").fetchall():
        raise ValueError("Transformed dump restore has invalid foreign keys")
    print(json.dumps({"verified_tables": len(names), "verified_rows": sum(x["rows"] for x in before.values())}))


def verify(source, target):
    manifest = json.loads(source.read_text())
    database = restore(target)
    for old, new in manifest["mapping"].items():
        if fingerprint(database, new) != manifest["tables"][old]:
            raise ValueError(f"Target mismatch: {new}")
    print(json.dumps({"verified_tables": len(manifest["mapping"]), "result": "exact_match"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["prepare", "verify"])
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("target", type=pathlib.Path)
    args = parser.parse_args()
    if args.operation == "prepare":
        prepare(args.source, args.target)
    else:
        verify(args.source, args.target)
