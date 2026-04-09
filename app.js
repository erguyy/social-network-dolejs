const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/auth',  require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));


app.get('/', (_req, res) => {
    res.json({ message: 'Sociální síť API běží.' });
});


app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint nenalezen.' });
});


app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Neočekávaná chyba serveru.' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
