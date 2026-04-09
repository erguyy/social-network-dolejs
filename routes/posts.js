const express = require('express');
const db      = require('../db');
const auth    = require('../middleware/auth');
const upload  = require('../middleware/upload');

const router = express.Router();


async function fetchPosts(whereClause, params) {
    const [posts] = await db.execute(
        `SELECT
            p.id, p.title, p.body, p.image, p.created_at,
            u.id   AS author_id,
            u.first_name, u.last_name, u.avatar,
            (SELECT COUNT(*) FROM likes    WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
         FROM posts p
         JOIN users u ON u.id = p.user_id
         ${whereClause}
         ORDER BY p.created_at DESC`,
        params
    );
    return posts;
}


router.get('/', auth, async (req, res) => {
    try {
        const posts = await fetchPosts('', []);
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});


router.get('/:id', auth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const posts = await fetchPosts('WHERE p.id = ?', [postId]);

        if (posts.length === 0) {
            return res.status(404).json({ error: 'Příspěvek nenalezen.' });
        }

        const post = posts[0];

        
        const [comments] = await db.execute(
            `SELECT c.id, c.body, c.created_at,
                    u.id AS author_id, u.first_name, u.last_name, u.avatar
             FROM comments c
             JOIN users u ON u.id = c.user_id
             WHERE c.post_id = ?
             ORDER BY c.created_at DESC`,
            [postId]
        );

        
        const [likes] = await db.execute(
            `SELECT l.id, l.created_at,
                    u.id AS user_id, u.first_name, u.last_name
             FROM likes l
             JOIN users u ON u.id = l.user_id
             WHERE l.post_id = ?
             ORDER BY l.created_at DESC`,
            [postId]
        );

        res.json({ ...post, comments, likes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});


router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { title, body } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Nadpis a text jsou povinné.' });
        }

        const image = req.file ? req.file.filename : null;

        const [result] = await db.execute(
            'INSERT INTO posts (user_id, title, body, image) VALUES (?, ?, ?, ?)',
            [req.user.id, title, body, image]
        );

        res.status(201).json({ message: 'Příspěvek vytvořen.', postId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});


router.delete('/:id', auth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        const [rows] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Příspěvek nenalezen.' });
        if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Nemáte oprávnění.' });

        await db.execute('DELETE FROM posts WHERE id = ?', [postId]);
        res.json({ message: 'Příspěvek smazán.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});




router.post('/:id/comments', auth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { body } = req.body;

        if (!body) return res.status(400).json({ error: 'Text komentáře nesmí být prázdný.' });

        
        const [postRows] = await db.execute('SELECT id FROM posts WHERE id = ?', [postId]);
        if (postRows.length === 0) return res.status(404).json({ error: 'Příspěvek nenalezen.' });

        const [result] = await db.execute(
            'INSERT INTO comments (user_id, post_id, body) VALUES (?, ?, ?)',
            [req.user.id, postId, body]
        );

        res.status(201).json({ message: 'Komentář přidán.', commentId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});


router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);

        const [rows] = await db.execute('SELECT user_id FROM comments WHERE id = ?', [commentId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Komentář nenalezen.' });
        if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Nemáte oprávnění.' });

        await db.execute('DELETE FROM comments WHERE id = ?', [commentId]);
        res.json({ message: 'Komentář smazán.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});




router.post('/:id/likes', auth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        const [postRows] = await db.execute('SELECT id FROM posts WHERE id = ?', [postId]);
        if (postRows.length === 0) return res.status(404).json({ error: 'Příspěvek nenalezen.' });

        const [existing] = await db.execute(
            'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
            [req.user.id, postId]
        );

        if (existing.length > 0) {
            
            await db.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
            return res.json({ message: 'Like odebrán.', liked: false });
        }

        await db.execute(
            'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
            [req.user.id, postId]
        );
        res.status(201).json({ message: 'Like přidán.', liked: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Chyba serveru.' });
    }
});

module.exports = router;
