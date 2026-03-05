const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = "segredo_super";

router.post("/register", async (req,res)=>{
    const { name,email,password } = req.body;

    const hashed = await bcrypt.hash(password,10);

    db.query("INSERT INTO users (name,email,password) VALUES (?,?,?)",
    [name,email,hashed],
    (err)=>{
        if(err) return res.status(400).json(err);
        res.json({message:"Usuário criado"});
    });
});

router.post("/login",(req,res)=>{
    const { email,password } = req.body;

    db.query("SELECT * FROM users WHERE email=?",[email],
    async (err,result)=>{
        if(result.length==0) return res.status(400).json({msg:"Usuário não encontrado"});

        const user = result[0];
        const valid = await bcrypt.compare(password,user.password);

        if(!valid) return res.status(400).json({msg:"Senha incorreta"});

        const token = jwt.sign(
            {id:user.id,role:user.role},
            SECRET,
            {expiresIn:"1d"}
        );

        res.json({token});
    });
});

module.exports = router;