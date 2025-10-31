import os
class Settings:
    PGHOST = os.getenv("PGHOST","127.0.0.1")
    PGPORT = int(os.getenv("PGPORT","5432"))
    PGUSER = os.getenv("PGUSER","postgres")
    PGPASSWORD = os.getenv("PGPASSWORD","postgres")
    PGDATABASE = os.getenv("PGDATABASE","peticoes_db")
    API_ROOT_PATH = os.getenv("API_ROOT_PATH","/peticoes/api")
settings = Settings()
