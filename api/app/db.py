from typing import AsyncGenerator
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncConnection
from .settings import settings

def dsn(db: str|None=None) -> str:
    return (f"postgresql+asyncpg://{settings.PGUSER}:{settings.PGPASSWORD}"
            f"@{settings.PGHOST}:{settings.PGPORT}/{db or settings.PGDATABASE}")

# engine default para o database principal
engine = create_async_engine(dsn(), pool_pre_ping=True)

@asynccontextmanager
async def get_conn(database: str|None=None) -> AsyncGenerator[AsyncConnection, None]:
    """
    Context manager assíncrono para obter uma conexão transacional (BEGIN/COMMIT).
    Usa o engine default quando database=None; caso contrário cria um engine temporário.
    """
    e = engine if database is None else create_async_engine(dsn(database), pool_pre_ping=True)
    try:
        async with e.begin() as conn:
            yield conn
    finally:
        if database is not None:
            await e.dispose()
