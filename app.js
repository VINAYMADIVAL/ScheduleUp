import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";

const app = express();

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))

//home page
app.get('/',(req, res)=>{
    res.render('home')
});
//login page
app.get("/login",(req, res)=>{
    res.render("login");
});
//register page
app.get("/register",(req, res)=>{
    res.render("register");
});

app.listen(3000, function() {
console.log("Server started on port 3000.");
});