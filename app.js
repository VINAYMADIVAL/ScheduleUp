import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import mongoose from 'mongoose';
import session from "express-session";
import 'dotenv/config';
import pkg from 'pg';

const app = express();

const { Pool } = pkg;
const pool = new Pool({
  user: process.env.USER_NAME,
  host: process.env.HOST_NAME,
  database: process.env.DATABASE_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.PORT,
});

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
    password: String,
    user_id: Number
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
                req.session.user_id = foundUser.user_id;
                res.redirect('/dashboard');
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
        const newUser = new User({email: req.body.username, password: req.body.password, user_id: req.body.user_id});
        
        try {
            await newUser.save();
            req.session.message = "Registration Success! Please login to join us";
            res.redirect('/');
        } catch (err) {
            console.log(err);
            res.status(500).send("Error saving user");
        }
});
//dashboard page
app.get('/dashboard', async (req, res) => {
  const client = await pool.connect();
  const userId = req.session.user_id;

  if (!userId) return res.redirect('/login');
  
  try {
    const userQuery = `
      SELECT
        weekday AS day,
        MAX(CASE WHEN slot_time = '10AM - 1PM' THEN status END) AS "10AM - 1PM",
        MAX(CASE WHEN slot_time = '2PM - 4PM' THEN status END) AS "2PM - 4PM"
      FROM user_schedule
      WHERE user_id = $1
      GROUP BY weekday
      ORDER BY
        CASE weekday
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END;
    `;

    const teamQuery = `
      SELECT
        u.name,
        MAX(CASE WHEN us.slot_time = '10AM - 1PM' THEN us.status END) AS "10AM - 1PM",
        MAX(CASE WHEN us.slot_time = '2PM - 4PM' THEN us.status END) AS "2PM - 4PM"
      FROM user_schedule us
      JOIN users u ON us.user_id = u.id
      WHERE us.weekday = trim(to_char(CURRENT_DATE, 'Day'))
      GROUP BY u.name
      ORDER BY u.name;
    `;

    const userResult = await client.query(userQuery, [userId]);
    const teamResult = await client.query(teamQuery);

    res.render("dashboard", {
      userSchedule: userResult.rows,
      teamSchedule: teamResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching schedules");
  } finally {
    client.release();
  }
});


app.listen(3000, ()=>{
console.log("Server started on port 3000.");
});