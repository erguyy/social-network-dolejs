const jwt = require('jsonwebtoken');
require('dotenv').config();

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Chybí autorizační hlavička.' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ error: 'Chybí token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, username }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Neplatný nebo vypršelý token.' });
    }
}

module.exports = authMiddleware;
