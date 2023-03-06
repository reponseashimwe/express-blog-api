const express = require('express');
const db = require('./model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const rand = require('randomatic');
const API_TOKEN = 'BLOPPOSTAPI';


const app = express();
app.use(express.json());
app.use(cors());
app.use('/photos', express.static('public'));

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public");
    },
    filename: function (req, file, callback) {
        callback(null, rand("A0", 10) + "_" + file.originalname)
    }
})

const photos = multer({storage: storage});

db.setable('users');

const PORT = 4000;

const users = [
    {
        id: 1,
        name: 'Reponse',
        email: 'rpns@gmail.com',
        password: '1234'
    },
    {
        id: 2,
        name: 'Reponse',
        email: 'rpns@gmail.com',
        password: '1234'
    },
    {
        id: 3,
        name: 'Reponse',
        email: 'rpns@gmail.com',
        password: '1234'
    },
]

app.listen(PORT, () => console.log('Running the server'))

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
  
    if (token == null) return res.sendStatus(401)
    try {
        const decoded = jwt.verify(token, API_TOKEN);
        req.requesting_user = decoded.id;
        next()
    } catch (err) {
        console.log(err);
        res.json({msg: "Invalid token"});
    }
  }

app.get('/users', authenticateToken, async (req, res) => {
    const users = await db.get();
    res.send(users);
});

app.post('/register', async (req, res) => {
    const name = req.body.name, password = req.body.password, email = req.body.email;
    if (name && password && email) {
        const existing = await db.exists(`email='${email}'`);
        if (existing) {
            return res.status(400).json({'status': 'error','body': 'Email already taken'});
        } else {
            db.setable('users');
            const pass = await bcrypt.hash(password, 10);
            db.insert("name, email, password", `'${name}', '${email}', '${pass}'`);
            const user = await db.exists(`email='${email}'`);
            const token = jwt.sign({id: user.id}, API_TOKEN);
            return res.status(201).json({
                'status': 'success', 
                'body': 'User created successfully', 
                'user': user,
                "authorisation": {
                    "token": token,
                    "type": "Bearer"
                }
            });
        }
    } else {
        return res.status(400).json({'status': 'error', 'body': 'Include name, email and password'});
    }
});

app.post('/login', async (req, res) => {
    db.setable('users');

    const password = req.body.password, email = req.body.email;
    if (password && email) {
        const existing = await db.exists(`email='${email}'`);
        if (!existing) {
            return res.status(400).json({'status': 'error','body': 'User not found'});
        } else {
            const pass = await bcrypt.compare(password, existing.password);
            if (!pass) {
                return res.status(400).json({'status': 'error','body': 'Incorrect password'});
            }

            const token = jwt.sign({id: existing.id}, API_TOKEN);

            return res.status(201).json({
                'status': 'success', 
                'user': existing,
                "authorisation": {
                    "token": token,
                    "type": "Bearer"
                }
            });
        }
    } else {
        return res.status(400).json({'status': 'error', 'body': 'Include email and password'});
    }
    res.status(400).json({'msg': 'Random error'});
});

app.get('/posts', authenticateToken, async (req, res) => {
    db.setable('posts');
    const posts = await db.get();
    res.json({data: posts});
});


app.post('/posts', authenticateToken, photos.single('photo'), async (req, res) => {
    db.setable('posts');
    if (req.body.title && req.body.content && req.file) {
        const insert = await db.insert('title, content, photo, user_id', `'${req.body.title}', '${req.body.content}', '${req.file.filename}', '${req.requesting_user}'`);
        const post = await db.latest();
        res.json({status: 'success', body: 'Post created',data: post});
    } else {
        return res.status(400).json({'status': 'error', 'body': 'Include title content and file'});
    }
});

app.get('/posts/:id', authenticateToken, async (req, res) => {
    db.setable('posts');
    const post = await db.exists(`id='${req.params.id}'`);
    db.setable('comments');
    const comments = await db.where(`post_id='${req.params.id}'`);
    post.comments = comments;

    res.json({status: 'success',body: post});
});

app.put('/posts/:id', authenticateToken, photos.single('photo'), async (req, res) => {
    db.setable('posts');
    if (req.body.title && req.body.content && req.file) {
        const post = await db.update(`content= '${req.body.content}', title= '${req.body.title}', photo= '${req.file.filename}'`, req.params.id);
        db.setable('comments');
        const comments = await db.where(`post_id='${req.params.id}'`);
        post.comments = comments;
        res.json({status: 'success', body: 'Post updated',data: post});
    } else {
        return res.status(400).json({'status': 'error', 'body': 'Include title content and file'});
    }
});

app.delete('/posts/:id', authenticateToken, async (req, res) => {
    db.setable('posts');
    const post = await db.delete(req.params.id);

    res.json({status: 'success',body: 'Post deleted', id: req.params.id});
});

app.post('/posts/:id/comment', authenticateToken, async (req, res) => {
    db.setable('comments');
    const insert = await db.insert('comment, user_id, post_id', `'${req.body.comment}', '${req.requesting_user}', '${req.params.id}'`);
    const comment = await db.latest();

    res.json({status: 'success',body: 'Comment created', data: comment});
});

app.put('/comments/:id', authenticateToken, async (req, res) => {
    db.setable('comments');
    const comment = await db.update(`comment= '${req.body.comment}'`, req.params.id);

    res.json({status: 'success',body: 'Comment updated', data: comment});
});

app.delete('/comments/:id', authenticateToken, async (req, res) => {
    db.setable('comments');
    const comment = await db.delete(req.params.id);

    res.json({status: 'success',body: 'Comment deleted', id: req.params.id});
});




