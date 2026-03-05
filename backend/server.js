const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const SECRET = "MEUSECRETO123";

// ================= MULTER UPLOAD =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + file.originalname;
    cb(null, unique);
  }
});
const upload = multer({storage});

// ================= MIDDLEWARE AUTENTICAÇÃO =================
function auth(req,res,next){
  const token = req.headers['authorization'];
  if(!token) return res.status(401).json({msg:'Não autorizado'});
  try{
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  }catch(err){
    res.status(401).json({msg:'Token inválido'});
  }
}

// ================= REGISTER =================
app.post('/api/auth/register', async (req,res)=>{
  const {name,email,password} = req.body;
  try{
    const hashed = await bcrypt.hash(password,10);
    await db.query('INSERT INTO users (name,email,password) VALUES (?,?,?)',[name,email,hashed]);
    res.json({message:'Conta criada com sucesso!'});
  }catch(err){
    console.error(err);
    res.status(400).json({message:'Erro ao criar conta'});
  }
});

// ================= LOGIN =================
app.post('/api/auth/login', async (req,res)=>{
  const {email,password} = req.body;
  try{
    const [rows] = await db.query('SELECT * FROM users WHERE email=?',[email]);
    if(rows.length===0) return res.status(400).json({msg:'Usuário não encontrado'});
    const user = rows[0];
    const match = await bcrypt.compare(password,user.password);
    if(!match) return res.status(400).json({msg:'Senha incorreta'});

    const token = jwt.sign({id:user.id,role:user.role},SECRET,{expiresIn:'12h'});
    res.json({token});
  }catch(err){
    console.error(err);
    res.status(500).json({msg:'Erro no login'});
  }
});

// ================= CREATE EVENT =================
app.post('/api/events/create', auth, upload.single('image'), async (req,res)=>{
  const {title, city, price, date} = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  try{
    await db.query('INSERT INTO events (title, city, price, date, image, user_id) VALUES (?,?,?,?,?,?)',
      [title, city, price, date, image, req.user.id]);
    res.json({message:'Evento criado!'});
  }catch(err){
    console.error(err);
    res.status(500).json({message:'Erro ao criar evento'});
  }
});

// ================= LIST EVENTS =================
app.get('/api/events', async (req,res)=>{
  const city = req.query.city || '';
  try{
    const [rows] = city
      ? await db.query('SELECT * FROM events WHERE city=?',[city])
      : await db.query('SELECT * FROM events');
    res.json(rows);
  }catch(err){
    console.error(err);
    res.status(500).json({msg:'Erro ao listar eventos'});
  }
});

// ================= BUY TICKET =================
app.post('/api/tickets/buy', auth, async (req,res)=>{
  const {event_id} = req.body;
  try{
    const reference = 'TKT-' + Date.now();
    const qr = await QRCode.toDataURL(reference);
    await db.query('INSERT INTO tickets (user_id,event_id,reference,qr,status) VALUES (?,?,?,?,?)',
      [req.user.id,event_id,reference,qr,'pending']);
    res.json({reference, qr});
  }catch(err){
    console.error(err);
    res.status(500).json({msg:'Erro ao comprar ticket'});
  }
});

// ================= DASHBOARD ADMIN =================
app.get('/api/admin/stats', auth, async (req,res)=>{
  if(req.user.role !== 'admin') return res.status(403).json({msg:'Acesso negado'});
  try{
    const [[users]] = await db.query('SELECT COUNT(*) as count FROM users');
    const [[events]] = await db.query('SELECT COUNT(*) as count FROM events');
    const [[tickets]] = await db.query('SELECT COUNT(*) as count FROM tickets');
    res.json({users:users.count,events:events.count,tickets:tickets.count});
  }catch(err){
    console.error(err);
    res.status(500).json({msg:'Erro ao buscar estatísticas'});
  }
});

// ================= LIST USERS =================
app.get('/api/admin/users', auth, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({msg:'Acesso negado'});
  const [rows] = await db.query('SELECT id,name,email,role,created_at FROM users');
  res.json(rows);
});

// ================= LIST TICKETS =================
app.get('/api/admin/tickets', auth, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({msg:'Acesso negado'});
  const [rows] = await db.query('SELECT t.id,t.reference,t.status,t.created_at,u.name as user,e.title as event FROM tickets t JOIN users u ON t.user_id=u.id JOIN events e ON t.event_id=e.id');
  res.json(rows);
});

// ================= LIST EVENTS ADMIN =================
app.get('/api/admin/events', auth, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({msg:'Acesso negado'});
  const [rows] = await db.query('SELECT e.*, u.name as owner FROM events e JOIN users u ON e.user_id=u.id');
  res.json(rows);
});

app.listen(3000,()=>console.log('Servidor rodando em http://localhost:3000'));