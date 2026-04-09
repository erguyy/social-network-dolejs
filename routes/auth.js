const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const upload = require('../middleware/upload');
require('dotenv').config();

const router = express.Router();


router.post('/register', upload.single('avatar'), async (req, res) => {
    try {
        const { first_name, last_name, age, gender, username, password } = req.body;

        
        if (!first_name || !last_name || !age || !gender || !username || !password) {
            return res.status(400).json({ error: 'Všechna povinná pole musí být vyplněna.' });
        }

        
        if (parseInt(age) < 13) {
            return res.status(400).json({ error: 'Uživatel musí mít alespoň 13 let.' });
        }

        
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Uživatelské jméno je již obsazeno.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const avatar = req.file ? req.file.filename : null;

        const [result] = await db.execute(
            'INSERT INTO users (first_name, last_name, age, gender, username, password, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [first_name, last_name, parseInt(age), gender, username, hashedPassword, avatar]
        );

        res.status(201).json({ message: 'Registrace proběhla úspěšně.', userId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Zadejte uživatelské jméno a heslo.' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Neplatné přihlašovací údaje.' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Neplatné přihlašovací údaje.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Přihlášení úspěšné.',
            token,
            user: {
                id:         user.id,
                first_name: user.first_name,
                last_name:  user.last_name,
                username:   user.username,
                avatar:     user.avatar,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});

module.exports = router;
