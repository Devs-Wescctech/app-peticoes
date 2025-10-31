from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import date
from sqlalchemy import text
from .db import get_conn

# Todas as rotas de petições começam em /petitions
router = APIRouter(prefix="/petitions")

class PetitionIn(BaseModel):
    title: str = Field(..., min_length=1)
    slug: str = Field(..., min_length=1)
    summary: Optional[str] = ""
    description: str = ""
    image_url: Optional[str] = ""
    goal: int = 1000
    deadline: Optional[date] = None
    status: str = "draft"
    require_cpf: bool = False
    require_phone: bool = False
    primary_color: str = "#3B82F6"
    terms_text: Optional[str] = ""

@router.get("")
async def list_petitions(
    status: Optional[str] = None,
    q: Optional[str] = None,
    order: str = "-created_date",
    page: int = 1,
    page_size: int = 100,
):
    """
    Lista petições (retorna lista simples, compatível com o front).
    Filtros opcionais: status, q. Ordenação segura via map.
    """
    from sqlalchemy import text as sqltext

    page      = max(1, page)
    page_size = max(1, min(page_size, 500))
    offset    = (page - 1) * page_size

    where = ["1=1"]
    params: dict = {"limit": page_size, "offset": offset}

    if status not in (None, ""):
        where.append("p.status = :status")
        params["status"] = status

    if q not in (None, ""):
        where.append("(p.title ILIKE :q OR p.slug ILIKE :q)")
        params["q"] = f"%{q}%"

    order_map = {
        "created_date":  "p.created_date ASC",
        "-created_date": "p.created_date DESC",
        "id":            "p.id ASC",
        "-id":           "p.id DESC",
    }
    order_by = order_map.get(order, "p.created_date DESC")

    sql = f"""
        SELECT p.*
        FROM public.petitions p
        WHERE {' AND '.join(where)}
        ORDER BY {order_by}
        LIMIT :limit OFFSET :offset
    """

    async with get_conn() as conn:
        rows = (await conn.execute(sqltext(sql), params)).mappings().all()

    return [dict(r) for r in rows]

@router.get("/{key}")
async def get_petition(key: str):
    """
    Busca por id numérico (pelo path) ou slug.
    """
    from sqlalchemy import text as sqltext
    sql = """
    SELECT *
    FROM public.petitions
    WHERE (CASE WHEN (:k ~ '^[0-9]+$') THEN id = CAST(:k AS bigint) ELSE FALSE END)
       OR slug = :k
    LIMIT 1;
    """
    async with get_conn() as conn:
        row = (await conn.execute(sqltext(sql), {"k": key})).mappings().first()
    if not row:
        raise HTTPException(404, "Petition not found")
    return dict(row)

@router.post("")
async def create_petition(p: PetitionIn):
    from sqlalchemy import text as sqltext
    sql = """
    INSERT INTO public.petitions
    (title, slug, summary, description, image_url, goal, deadline, status,
     require_cpf, require_phone, primary_color, terms_text, created_date, updated_date)
    VALUES
    (:title, :slug, :summary, :description, :image_url, :goal, :deadline, :status,
     :require_cpf, :require_phone, :primary_color, :terms_text, now(), now())
    ON CONFLICT (slug) DO UPDATE SET
      title=EXCLUDED.title, summary=EXCLUDED.summary, description=EXCLUDED.description,
      image_url=EXCLUDED.image_url, goal=EXCLUDED.goal, deadline=EXCLUDED.deadline,
      status=EXCLUDED.status, require_cpf=EXCLUDED.require_cpf, require_phone=EXCLUDED.require_phone,
      primary_color=EXCLUDED.primary_color, terms_text=EXCLUDED.terms_text, updated_date=now()
    RETURNING *;
    """
    async with get_conn() as conn:
        row = (await conn.execute(sqltext(sql), p.model_dump())).mappings().first()
    return dict(row)

@router.patch("/{id:int}")
async def update_petition(id: int, p: PetitionIn):
    from sqlalchemy import text as sqltext
    payload = {"id": id, **p.model_dump()}
    sql = """
    UPDATE public.petitions SET
      title=COALESCE(:title, title),
      slug=COALESCE(:slug, slug),
      summary=COALESCE(:summary, summary),
      description=COALESCE(:description, description),
      image_url=COALESCE(:image_url, image_url),
      goal=COALESCE(:goal, goal),
      deadline=COALESCE(:deadline, deadline),
      status=COALESCE(:status, status),
      require_cpf=COALESCE(:require_cpf, require_cpf),
      require_phone=COALESCE(:require_phone, require_phone),
      primary_color=COALESCE(:primary_color, primary_color),
      terms_text=COALESCE(:terms_text, terms_text),
      updated_date=now()
    WHERE id=:id
    RETURNING *;
    """
    async with get_conn() as conn:
        row = (await conn.execute(sqltext(sql), payload)).mappings().first()
    if not row:
        raise HTTPException(404, "Petition not found")
    return dict(row)
