const express = require('express');
const db = require('./model');
const {User, Post, Comment} = require('../models/index');
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


const PORT = 4000;

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

const exist = (table) => {
    return async (req, res, next) => {
        var data = null;
        req.table = table;
        if (table == 'post') {
             data = await Post.findByPk(req.params.id);
        } else if (table == 'comment') {
             data = await Comment.findByPk(req.params.id);
        }
        if (data==null) {
            res.status(400).json({status: 'error', 'body': `${table} doesn't exist`});
        } else {
            next();
        }
    }
}

const is_author = (table) => {
    return async (req, res, next) => {
        var data = null;
        if (table == 'post') {
             data = await Post.findByPk(req.params.id);
        } else if (table == 'comment') {
             data = await Comment.findByPk(req.params.id);
        }
        if (data.user_id != req.requesting_user) {
            res.status(403).json({status: 'error', 'body': `You are not the author`});
        } else {
            next();
        }
    }
}

app.get('/users', authenticateToken, async (req, res) => {
    const users = await db.get();
    res.send(users);
});

app.post('/register', async (req, res) => {
    const name = req.body.name, password = req.body.password, email = req.body.email;
    if (name && password && email) {
        const existing = await User.findOne({where: {email}});
        if (existing != null) {
            return res.status(400).json({'status': 'error','body': 'Email already taken'});
        } else {
            
            const pass = await bcrypt.hash(password, 10);
            
            const newUser = await User.create({name, email, password:pass});
            const user = await User.findOne({where: {email}});

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
    const password = req.body.password, email = req.body.email;
    if (password && email) {
        const existing = await User.findOne({where: {email}});
        if (existing == null) {
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
});

app.post('/logout', authenticateToken, (req, res) => {
    res.cookie('jwt', '', {maxAge: 1});
    res.json({'status': 'success', body: 'Logged out'});
});


app.get('/posts', authenticateToken, async (req, res) => {
    const posts = await Post.findAll({order:[['createdAt', 'DESC']]});
    res.json({data: posts});
});


app.post('/posts', authenticateToken, photos.single('photo'), async (req, res) => {
    db.setable('posts');
    if (req.body.title && req.body.content && req.file) {
        const insert = await Post.create({title: req.body.title, content: req.body.content, photo: req.file.filename, user_id: req.requesting_user});
        const post = await Post.findOne({order:[['createdAt', 'DESC']]});
        res.json({status: 'success', body: 'Post created',data: post});
    } else {
        return res.status(400).json({'status': 'error', 'body': 'Include title content and file'});
    }
});

app.get('/posts/:id', authenticateToken, exist('post'), async (req, res) => {
    const post = await Post.findOne({where: {id: req.params.id}, include: Comment});
    res.json({status: 'success', body: post});
});

app.put('/posts/:id', authenticateToken, exist('post'), is_author('post'), photos.single('photo'), async (req, res) => {
    db.setable('posts');
    if (req.body.title && req.body.content && req.file) {
        const update = await Post.update({title: req.body.title, content: req.body.content, photo: req.file.filename, user_id: req.requesting_user}, {where: {id: req.params.id}});
        const post = await Post.findOne({where: {id: req.params.id}, include: Comment});
        res.json({status: 'success', body: 'Post updated',data: post});
    } else {
        return res.status(400).json({'status': 'error', 'body': 'Include title content and file'});
    }
});

app.delete('/posts/:id', authenticateToken, exist('post'), is_author('post'), async (req, res) => {
    const post = await Post.destroy({where: req.params.id});

    res.json({status: 'success',body: 'Post deleted', id: req.params.id});
});

app.post('/posts/:id/comment', authenticateToken, exist('post'), async (req, res) => {
    console.log(req.body.comment);
    const insert = await Comment.create({comment: req.body.comment, user_id: req.requesting_user, post_id: req.params.id});
    const comment = await Comment.findOne({order: [['id', 'DESC']]});

    res.json({status: 'success',body: 'Comment created', data: comment});
});

app.put('/comments/:id', authenticateToken, exist('comment'), is_author('comment'), async (req, res) => {
    const update = await Comment.update({comment: req.body.comment}, {where: {id: req.params.id}});
    const comment = await Comment.findOne({where: {id: req.params.id}});
    res.json({status: 'success',body: 'Comment updated', data: comment});
});

app.delete('/comments/:id', authenticateToken, exist('comment'), is_author('comment'), async (req, res) => {
    const comment = await Comment.destroy({where: {id: req.params.id}});

    res.json({status: 'success',body: 'Comment deleted', id: req.params.id});
});




