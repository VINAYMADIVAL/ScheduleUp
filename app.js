import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import mongoose from 'mongoose';
import session from "express-session";
import 'dotenv/config';

const app = express();

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

mongoose.connect('mongodb://localhost:27017/teamDB')

const userSchema = {
    email: String,
    password: String
}

const User = new mongoose.model('member', userSchema)

//home page
app.get('/',(req, res)=>{
    const message = req.session.message;
    req.session.message = null; // Clear it after showing
    res.render("home", { message });
});
//login page
app.route('/login')
    .get((req, res)=>{
        res.render("login");
    })
    .post(async(req, res)=>{
        const username = req.body.username
        const password = req.body.password
        try{
            const foundUser = await User.findOne({email: username});
            if(!foundUser) return res.status(404).send("No User Found!");
            if(foundUser.password === password) {
                res.status(200).send("Login Success!");
            } else{
                return res.status(401).send("Wrong username or password!");
            }
        } catch (error){
            console.log(error);
            res.status(500).send("Internal Server Error!");
        }
});
//register page
app.route('/register')
    .get((req, res)=>{
        res.render("register");
    })
    .post(async(req,res)=>{
        const newUser = new User({email: req.body.username, password: req.body.password})
        
        try {
            await newUser.save();
            req.session.message = "Registration Success! Please login to join us";
            res.redirect('/');
        } catch (err) {
            console.log(err);
            res.status(500).send("Error saving user");
        }
});

app.listen(3000, ()=>{
console.log("Server started on port 3000.");
});