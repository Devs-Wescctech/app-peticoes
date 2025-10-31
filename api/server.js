import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import pkg from "pg";
import dotenv from "dotenv";
import { RateLimiterMemory } from "rate-limiter-flexible";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: true, credentials: true }));

const limiter = new RateLimiterMemory({ points: 100, duration: 60 });
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

const PetitionSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  description: z.string().min(1),
  image_url: z.string().optional().nullable(),
  goal: z.number().int().positive(),
  deadline: z.string().optional().nullable(),
  status: z.enum(["draft","published","paused","closed"]).default("draft"),
  require_cpf: z.boolean().default(false),
  require_phone: z.boolean().default(false),
  primary_color: z.string().default("#3B82F6"),
  terms_text: z.string().optional().nullable()
});
const SignatureSchema = z.object({
  petition_id: z.string().uuid(),
  full_name: z.string().min(1),
  email: z.string().email(),
  cpf: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  terms_accepted: z.boolean().optional().default(true),
  terms_accepted_at: z.string().optional().nullable(),
  verified: z.boolean().optional().default(true),
  protocol: z.string().optional().nullable()
});

app.get("/health", (_req,res)=>res.json({ok:true}));

app.get("/petitions", async (req,res)=>{
  const sort = (req.query.sort || "-created_date");
  const order = sort.startsWith("-") ? "DESC" : "ASC";
  const field = sort.replace("-","");
  const client = await pool.connect();
  try {
    const q = `SELECT * FROM petitions ORDER BY ${field} ${order}`;
    const { rows } = await client.query(q);
    res.json(rows);
  } finally { client.release(); }
});

app.get("/petitions/filter", async (req,res)=>{
  const { slug, status } = req.query;
  const clauses = [];
  const params = [];
  if (slug) { params.push(slug); clauses.push(`slug = $${params.length}`); }
  if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM petitions ${where} ORDER BY created_date DESC`, params);
    res.json(rows);
  } finally { client.release(); }
});

app.post("/petitions", async (req,res)=>{
  const data = PetitionSchema.parse(req.body);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO petitions
        (title, slug, summary, description, image_url, goal, deadline, status,
         require_cpf, require_phone, primary_color, terms_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [data.title, data.slug ?? null, data.summary ?? null, data.description, data.image_url ?? null,
       data.goal, data.deadline ?? null, data.status, data.require_cpf ?? false, data.require_phone ?? false,
       data.primary_color ?? "#3B82F6", data.terms_text ?? null]
    );
    res.status(201).json(rows[0]);
  } finally { client.release(); }
});

app.put("/petitions/:id", async (req,res)=>{
  const id = req.params.id;
  const data = PetitionSchema.partial().parse(req.body);
  const fields = Object.keys(data);
  if (!fields.length) return res.status(400).json({error:"no fields"});
  const sets = fields.map((k,i)=>`${k} = $${i+1}`);
  const vals = fields.map(k=>data[k]);
  vals.push(id);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `UPDATE petitions SET ${sets.join(", ")}, updated_date = now() WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    res.json(rows[0]);
  } finally { client.release(); }
});

app.get("/signatures", async (req,res)=>{
  const sort = (req.query.sort || "-created_date");
  const order = sort.startsWith("-") ? "DESC" : "ASC";
  const field = sort.replace("-","");
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM signatures ORDER BY ${field} ${order}`);
    res.json(rows);
  } finally { client.release(); }
});

app.post("/signatures", async (req,res)=>{
  try { await limiter.consume(req.ip); } catch { return res.status(429).json({error:"Too Many Requests"}); }
  const raw = req.body;
  raw.ip_address = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || null;
  raw.user_agent = req.headers["user-agent"] || null;

  const data = SignatureSchema.parse(raw);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO signatures
        (petition_id, full_name, email, cpf, phone, city, state,
         ip_address, user_agent, utm_source, utm_medium, utm_campaign,
         terms_accepted, terms_accepted_at, verified, protocol)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [data.petition_id, data.full_name, data.email, data.cpf ?? null, data.phone ?? null,
       data.city ?? null, data.state ?? null, data.ip_address ?? null, data.user_agent ?? null,
       data.utm_source ?? null, data.utm_medium ?? null, data.utm_campaign ?? null,
       data.terms_accepted ?? true, data.terms_accepted_at ?? null, data.verified ?? true, data.protocol ?? null]
    );
    res.status(201).json(rows[0]);
  } finally { client.release(); }
});

const port = process.env.PORT || 4000;
app.listen(port, ()=>console.log(`API up on :${port}`));
