const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');

const router = express.Router();


router.get('/', auth, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, first_name, last_name, age, gender, avatar, created_at
             FROM users
             ORDER BY last_name ASC, first_name ASC`
        );
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});


router.get('/me', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, first_name, last_name, age, gender, avatar, username, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Uživatel nenalezen.' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});


router.get('/:id', auth, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        
        const [userRows] = await db.execute(
            'SELECT id, first_name, last_name, age, gender, avatar, username, created_at FROM users WHERE id = ?',
            [userId]
        );
        if (userRows.length === 0) return res.status(404).json({ error: 'Uživatel nenalezen.' });
        const user = userRows[0];

        
        const [ownPosts] = await db.execute(
            `SELECT
                p.id, p.title, p.body, p.image, p.created_at,
                u.id AS author_id, u.first_name, u.last_name, u.avatar,
                (SELECT COUNT(*) FROM likes    WHERE post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
             FROM posts p
             JOIN users u ON u.id = p.user_id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [userId]
        );

        
        const [interactedPosts] = await db.execute(
            `SELECT DISTINCT
                p.id, p.title, p.body, p.image, p.created_at,
                u.id AS author_id, u.first_name, u.last_name, u.avatar,
                (SELECT COUNT(*) FROM likes    WHERE post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
             FROM posts p
             JOIN users u ON u.id = p.user_id
             WHERE p.user_id != ?
               AND (
                   EXISTS (SELECT 1 FROM likes    WHERE post_id = p.id AND user_id = ?)
                OR EXISTS (SELECT 1 FROM comments WHERE post_id = p.id AND user_id = ?)
               )
             ORDER BY p.created_at DESC`,
            [userId, userId, userId]
        );

        res.json({ user, own_posts: ownPosts, interacted_posts: interactedPosts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});

module.exports = router;
