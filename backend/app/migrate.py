"""Migraciones ligeras al arrancar.

`Base.metadata.create_all` crea las tablas que faltan pero nunca añade columnas
a una tabla que ya existe. Como el proyecto no usa Alembic, aquí se completan a
mano las columnas nuevas; la sintaxis usada es válida en MySQL y PostgreSQL.
"""

from sqlalchemy import Engine, inspect, text

# tabla -> [(columna, tipo SQL)]
NEW_COLUMNS: dict[str, list[tuple[str, str]]] = {
    "tasks": [("start_date", "DATE"), ("end_date", "DATE")],
}


def run_light_migrations(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    for table, columns in NEW_COLUMNS.items():
        if table not in tables:
            continue  # la acaba de crear create_all, ya viene completa
        existing = {c["name"] for c in inspector.get_columns(table)}
        missing = [(name, sql) for name, sql in columns if name not in existing]
        if not missing:
            continue
        with engine.begin() as conn:
            for name, sql_type in missing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
                print(f"[migrate] {table}.{name} añadida")
