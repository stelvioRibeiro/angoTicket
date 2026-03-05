const router = require("express").Router();
const db = require("../db");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

router.post("/buy", async (req,res)=>{
    const { user_id,event_id } = req.body;

    const reference = uuidv4().substring(0,8);
    const qr = await QRCode.toDataURL(reference);

    db.query(
    "INSERT INTO tickets (user_id,event_id,reference_code,qr_code) VALUES (?,?,?,?)",
    [user_id,event_id,reference,qr],
    ()=> res.json({reference,qr})
    );
});

module.exports = router;