const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');



const documentRoutes = require('./routes/document');

const app = express();
const PORT = process.env.PORT || 8000;

// Enhanced CORS configuration for Replit environment
// app.use(cors({
//   origin: ''
// }));
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS check for origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin - allowing request');
      return callback(null, true);
    }
    
    // Allow all localhost origins for development
    if (origin.includes('localhost')) {
      console.log('Localhost origin - allowing request');
      return callback(null, true);
    }
    
    // Allow all Replit domains
    if (origin.includes('replit.dev') || origin.includes('replit.co')) {
      console.log('Replit domain - allowing request');
      return callback(null, true);
    }

    if(origin.includes('elasticbeanstalk.com')){
      return callback(null,true);
    }
    
    console.log('Origin not allowed:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  optionsSuccessStatus: 200
}));

// Additional CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (!origin || origin.includes('localhost') || origin.includes('replit.dev') || origin.includes('replit.co')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});


app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api', documentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'TA AI Document Analyzer API'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

//Login Page
app.get('/auth/login',(req,res)=>{
  const loginUrl = `https://eu-north-1gux3lmqta.auth.eu-north-1.amazoncognito.com/login`+
  `?response_type=code`+
  `&client_id=28ai661e3t55hiomcj0818dmqa`+
  `&redirect_uri=http://localhost:8000/auth/callback`+
  `&scope=openid+email+profile`;

  res.redirect(loginUrl);
})

//handle callback
app.get('/auth/callback',async(req,res)=>{
  const code = req.query.code;
  const clientId = '28ai661e3t55hiomcj0818dmqa' ;
  const clientSecret = '1ajdlrh86ssjc51o8ti5gbkf5g1sf68q6ch0chdq37spat9o7uq';
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');


try{


  const tokenRes = await axios.post(
    'https://eu-north-1gux3lmqta.auth.eu-north-1.amazoncognito.com/oauth2/token',
    querystring.stringify({
      grant_type: 'authorization_code',
      client_id: '28ai661e3t55hiomcj0818dmqa',
      redirect_uri: 'http://localhost:8000/auth/callback',
      code,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' ,
      'Authorization': `Basic ${authHeader}`,
    }}
  );
  const {id_token} = tokenRes.data;
  const user = jwt.decode(id_token);
  const user_Id = user.sub;
  res.cookie('id_token',id_token,{httpOnly:true});
  res.cookie('user_Id',user_Id,{httpOnly:true});
  // res.send(`User ID: ${user_Id}`);
  console.log('userId: '+user_Id);
  // console.log('Set-Cookie-Header: ',res.getHeader('Set-Cookie'));
  // res.json({message:'Login Successful',user});
  res.redirect('http://localhost:5000/userproject');
}
catch(err){
console.error('Token exchange failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Authentication failed', details: err.message });
  
}
});
app.get('/logout',async (req,res)=>{
  res.clearCookie('user_Id', { path: '/', httpOnly: true});

  const clientId = '28ai661e3t55hiomcj0818dmqa';
  const domain = 'https://eu-north-1gux3lmqta.auth.eu-north-1.amazoncognito.com'; 
  const logoutUri = encodeURIComponent('http://localhost:8000/auth/login'); //  redirect after logout

  const logoutUrl = `${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
  res.redirect(logoutUrl);
  console.log("Logout: ",logoutUrl);
  console.log(res.cookies);
  

})

// app.use('/process',(req,res)){

// }

app.use((req, res, next) => {
  console.log('Incoming cookies:', req.cookies);
  
  next();
});

// Redirect root to frontend application
app.get('/', (req, res) => {
  const frontendUrl = `https://${req.get('host').replace(':80', ':5000')}`;
  res.redirect(frontendUrl);
});


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TA AI Document Analyzer API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

