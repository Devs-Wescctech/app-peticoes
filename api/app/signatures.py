# app/signatures.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy import text
from .db import get_conn

router = APIRouter(prefix="/signatures", tags=["signatures"])

class SignIn(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    terms_accepted: bool
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None

def get_petition_sql():
    # Aceita UUID (com hífens) OU slug
    return """
    SELECT id, require_cpf, require_phone
    FROM public.petitions
    WHERE (
      (:k ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$' AND id = CAST(:k AS uuid))
      OR slug = :k
    )
    """

async def fetch_petition(conn, key: str):
    row = (await conn.execute(text(get_petition_sql()), {"k": key})).mappings().first()
    if not row:
        raise HTTPException(404, "Petition not found")
    return row  # dict-like: id, require_cpf, require_phone

@router.get("/by-petition/{key}")
async def list_by_petition(
    key: str,
    since: Optional[str] = None,
    until: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
):
    limit = max(1, min(page_size, 200))
    offset = max(0, (page - 1) * limit)
    async with get_conn() as conn:
        p = await fetch_petition(conn, key)
        params = {
            "petition_id": p["id"],
            "since": since,
            "until": until,
            "limit": limit,
            "offset": offset,
        }
        list_sql = """
        SELECT s.*
        FROM public.signatures s
        WHERE s.petition_id = :petition_id
          AND (:since IS NULL OR s.created_date >= :since::timestamp)
          AND (:until IS NULL OR s.created_date <  :until::timestamp + INTERVAL '1 day')
        ORDER BY s.created_date DESC
        LIMIT :limit OFFSET :offset;
        """
        total_sql = """
        SELECT COUNT(*)
        FROM public.signatures s
        WHERE s.petition_id = :petition_id
          AND (:since IS NULL OR s.created_date >= :since::timestamp)
          AND (:until IS NULL OR s.created_date <  :until::timestamp + INTERVAL '1 day');
        """
        items = (await conn.execute(text(list_sql), params)).mappings().all()
        total = (await conn.execute(text(total_sql), params)).scalar_one()
    return {"items": [dict(r) for r in items], "page": page, "page_size": limit, "total": total}

@router.post("/by-petition/{key}")
async def create_signature(key: str, body: SignIn, request: Request):
    async with get_conn() as conn:
        p = await fetch_petition(conn, key)
        if p["require_cpf"] and not body.cpf:
            raise HTTPException(400, "CPF é obrigatório")
        if p["require_phone"] and not body.phone:
            raise HTTPException(400, "Telefone é obrigatório")

        # Campos opcionais do seu schema (se existirem nas colunas):
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")

        insert_sql = """
        INSERT INTO public.signatures
        (petition_id, full_name, email, cpf, phone, city, state,
         utm_source, utm_medium, utm_campaign,
         terms_accepted, terms_accepted_at,
         protocol, verified, created_date,
         ip_address, user_agent)
        VALUES
        (:petition_id, :full_name, :email, :cpf, :phone, :city, :state,
         :utm_source, :utm_medium, :utm_campaign,
         :terms_accepted, now(),
         :protocol, true, now(),
         :ip_address, :user_agent)
        ON CONFLICT (petition_id, email) DO NOTHING
        RETURNING *;
        """
        params = {
            **body.model_dump(),
            "petition_id": p["id"],
            "protocol": "P-",  # troque por ULID/UUID curto se quiser
            "ip_address": ip,
            "user_agent": ua,
        }
        row = (await conn.execute(text(insert_sql), params)).mappings().first()
        if not row:
            raise HTTPException(409, "Assinatura já existe para esta petição")
        return {"ok": True, **dict(row)}

@router.get("/stats/{key}")
async def stats(key: str):
    async with get_conn() as conn:
        p = await fetch_petition(conn, key)
        pid = p["id"]
        totals = (
            await conn.execute(
                text(
                    """
            SELECT
              (SELECT COUNT(*) FROM public.signatures WHERE petition_id=:pid) AS total,
              (SELECT COUNT(*) FROM public.signatures WHERE petition_id=:pid AND created_date::date = now()::date) AS today
            """
                ),
                {"pid": pid},
            )
        ).mappings().first()
        series = (
            await conn.execute(
                text(
                    """
            SELECT to_char(d::date,'YYYY-MM-DD') AS date, COALESCE(x.cnt,0) AS count
            FROM generate_series(now()::date - INTERVAL '29 day', now()::date, '1 day') d
            LEFT JOIN (
              SELECT created_date::date AS d, COUNT(*) AS cnt
              FROM public.signatures
              WHERE petition_id=:pid
              GROUP BY 1
            ) x ON x.d = d::date
            ORDER BY date
            """
                ),
                {"pid": pid},
            )
        ).mappings().all()
    return {"total": totals["total"], "today": totals["today"], "by_day": [dict(r) for r in series]}
