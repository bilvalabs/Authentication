require('dotenv').config();
const express = require('express');
const path = require('path'); // Moved up
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const cors = require('cors');
const app = express();
connectDB();

app.use(cors());

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares
app.use(bodyParser.urlencoded({ extended: true })); // Added this line
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { httpOnly: true, sameSite: 'strict' }
}));

// Redirect root to login page
app.get('/', (req, res) => {
  res.redirect('/auth/login');
});

// Routes
app.use('/auth', authRoutes);

// Sample GET route to display user data without exposing password
app.get('/data', (req, res) => {
  if (!req.session.user) return res.status(401).send('Unauthorized');
  
  res.send(`<html>
    <body style="background-color:black;color:green;">
      <h1>User Data</h1>
      <table>
        <tr><th>Username</th></tr>
        <tr><td>${req.session.user.username}</td></tr>
      </table>
    </body>
  </html>`);
});

// Alternative secure route
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: 'Unauthorized' });
  
  const { username } = req.session.user;
  res.json({ username });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
