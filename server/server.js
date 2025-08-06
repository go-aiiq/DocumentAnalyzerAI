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
const BASE_URL = process.env.API_BASE_URL;
const redirectBase = process.env.REDIRECT_BASE_URL||'http://localhost:5000';
const cognitoURL = process.env.COGNITO_URL||'http://localhost:8000';



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

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Additional CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (!origin || origin.includes('localhost') || origin.includes('replit.dev') || origin.includes('replit.co') || origin.includes('elasticbeanstalk.com')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Content-Length');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
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
    service: 'TC AI Document Analyzer API'
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




app.get('/.well-known/pki-validation/:79ED671DF7306B75CF56DCB390005692.txt', (req, res) => {
  const filePath = path.join(__dirname, 'public','ta-ai-document-analyzer', '.well-known', 'pki-validation','79ED671DF7306B75CF56DCB390005692.txt' );
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

app.get('/auth/check', (req, res) => {
  const token = req.cookies.user_Id;
  console.log("token: ",token);
  if (!token) return res.status(401).send('Not authenticated');
  res.send({ authenticated: true });
});

//Login Page
app.get('/auth/login',(req,res)=>{
  
  const loginUrl = `https://eu-north-1gux3lmqta.auth.eu-north-1.amazoncognito.com/login`+
  `?response_type=code`+
  `&client_id=28ai661e3t55hiomcj0818dmqa`+
  `&redirect_uri=${cognitoURL}/auth/callback`+
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
      redirect_uri: `${cognitoURL}/auth/callback`,
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
  res.redirect(`${redirectBase}/userproject`);
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
  const logoutUri = encodeURIComponent(`${BASE_URL}/auth/login`); //  redirect after logout

  const logoutUrl = `${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
  res.redirect(logoutUrl);
  console.log("Logout: ",logoutUrl);
  console.log(res.cookies);
  

})

if(BASE_URL.includes('elasticbeanstalk.com')){
app.use(express.static(path.join(__dirname, 'public/ta-ai-document-analyzer')));

// Serve index.html for all unmatched routes (for Angular routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/ta-ai-document-analyzer/index.html'));
});
}
else{
  app.get('/', (req, res) => {
  const frontendUrl = `https://${req.get('host').replace(':80', ':5000')}`;
  res.redirect(frontendUrl);
});
}

// app.use('/process',(req,res)){

// }

app.use((req, res, next) => {
  console.log('Incoming cookies:', req.cookies);
  
  next();
});

// Redirect root to frontend application
// app.get('/', (req, res) => {
//   const frontendUrl = `https://${req.get('host').replace(':80', ':5000')}`;
//   res.redirect(frontendUrl);
// });




// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TC AI Document Analyzer API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

