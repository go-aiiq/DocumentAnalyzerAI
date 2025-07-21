const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

const uploadMiddleware = require('../middleware/upload');
const landingAIService = require('../services/landingai');
const landingAI = require('../services/lai');
const s3Service = require('../services/s3');

const router = express.Router();

// Health check endpoint for API
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'TA AI Document Analyzer API'
  });
});

//Input Project Name
router.post('/input',async(req,res)=>{
  const val =req.body.value;  
  const userId = req.cookies.user_Id;
  console.log("Req body : ",req.body);
  console.log("Project Name is: ",val);
  res.cookie('projectName',val,{httpOnly:true});
  const resp = await s3Service.createFolder(userId,val);
  console.log("Inside Document: "+resp);
  res.json({ success: true, val });
});

// Delete folder endpoint
router.delete('/deleteFolder', async (req, res) => {
  try {
    const { folderName } = req.body;
    const userId = req.cookies.user_Id;
    
    if (!folderName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Folder name is required' 
      });
    }
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }
    
    console.log(`Deleting folder: ${folderName} for user: ${userId}`);
    const result = await s3Service.deleteFolder(userId, folderName);
    
    if (result.deleted) {
      res.json({ 
        success: true, 
        message: result.message 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: result.message || 'Failed to delete folder' 
      });
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete folder',
      details: error.message 
    });
  }
});


router.post('/delete', async (req, res) => {
  try {
    const { fileKey } = req.body; // Full path to the file in S3
    const userId = req.cookies.user_Id;

    if (!fileKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'File key is required' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    console.log(`Deleting file: ${fileKey} for user: ${userId}`);
    
    const params = {
      Bucket: "taai-uploaded-documents", // Change to your bucket name
      Key: fileKey
    };

    const resp = await s3Service.deleteFile(fileKey);
console.log("resp " , resp);
    res.json({ 
      success: true, 
      message: `File ${fileKey} deleted successfully.` 
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete file',
      details: error.message 
    });
  }
});




//get extractedData from s3
router.post('/getExtractedData',async(req,res)=>{
  try{
    const file = req.body.file;
    const resp = await s3Service.getResults(file);
    console.log("resp for getresults ",resp);
  }

catch(e){
  console.log("Error ",e);
}
});


// store extractedData to s3
router.post('/submit',async(req,res)=>{

  const fileurl = req.body.fileurl;
  const decodedUrl = decodeURIComponent(fileurl);
  // console.log("fileurl: ",fileurl );
  const path = decodedUrl.split('.amazonaws.com/')[1].split('?')[0];
  const segments = path.split('/');
  const filename = segments.pop().replace(/\.[^/.]+$/, '');
  const folderPath = segments.join('/') + '/';
  const extractedDataJSON =req.body.data;
  const jsonString = JSON.stringify(extractedDataJSON);
  console.log(jsonString);
  console.log("file: ",folderPath); 
  const fileUrl = await s3Service.storeResults(folderPath,filename,jsonString);
  // console.log("Storing: ",fileurl);
  res.json({fileUrl});

});

router.post('/getResults',async(req,res)=>{
  try{
    const fileurl = req.body.filename;
  const decodedUrl = decodeURIComponent(fileurl) ;
    console.log("fileurl:  ",fileurl );
  const path = decodedUrl.split('.amazonaws.com/')[1].split('?')[0];
  const segments = path.split('/');
  const filename = segments.pop().replace(/\.[^/.]+$/, '');
  const folderPath = segments.join('/') + '/extractedData'; 
    const response = await s3Service.getResults(folderPath,filename);
    console.log(response);
    res.json(
      response    );
  }
  catch(e){
    console.log("Error: ",e);
  }
})

//Get Files endpoint
router.post('/getFiles',async (req,res) => {
  try{
    const userId = req.cookies.user_Id;
console.log('UserId :',userId);
const response = await s3Service.getFilesFolderwise(userId);
// console.log("response: ",response);
res.json({response});


  }
  catch(e){
    console.error('Error grouping files:', e);
      res.status(500).json({ error: 'Failed to group files' });
  }

});

// File upload endpoint
router.post('/upload', uploadMiddleware.single('file'), async (req, res) => {
  try {
    const userId = req.cookies.user_Id;
    const projName=req.body.folderName?req.body.folderName:req.cookies.projectName;
    // const projName = req.cookies.projectName;
    // console.log("req.cookies: "+JSON.stringify(req.cookies));
    // console.log("Inside document.js: "+userId);
    // console.log("Project Name:"+ projName);
    console.log('Upload request received:', {
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file received',
      credentials: 'include'

    });
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ 
        error: 'No file uploaded',
        success: false 
      });
    }



    

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Only PDF files are allowed',
        success: false 
      });
    }

    // Simulate S3 upload (in real implementation, this would upload to actual S3)
    const fileUrl = await s3Service.uploadFile(req.file,userId,projName);

    // Clean up local file after "upload"
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message,
      success: false 
    });
  }
});

// Document processing endpoint
// router.post('/process', async (req, res) => {
//   try {
//     const { fileUrl } = req.body;
    
//     if (!fileUrl) {
//       return res.status(400).json({ 
//         error: 'File URL is required' 
//       });
//     }

//     // Process document using LandingAI service
//     console.log('Backend route: calling LandingAI service...');
//     const result = await landingAIService.processDocument(fileUrl);
    
//     console.log('Backend route: received result from LandingAI service');
//     console.log('Backend route: result documentId:', result.documentId);
//     console.log('Backend route: sending result to frontend...');
//     res.json(result);

//   } catch (error) {
//     console.error('Processing error:', error);
//     res.status(500).json({ 
//       error: 'Document processing failed',
//       message: error.message 
//     });
//   }
// });

router.post('/process',async(req,res)=>{
     try {
      console.log("RequestBody ",req.body);
    const fileUrl  = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ 
        error: 'File URL is required' 
      });
    }

    // Process document using LandingAI service
    console.log('Backend route: calling LandingAI service...');
    const result = await landingAI.analyzeDocument(fileUrl);
    
    console.log('Backend route: received result from LandingAI service');
    console.log('Backend route: result documentId:', result.documentId);
    console.log('Backend route: sending result to frontend...');
    res.json(result);

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ 
      error: 'Document processing failed',
      message: error.message 
    });
  }

})
// router.get('/view/:filename', (req, res) => {
//   const filename = req.params.filename;
//   console.log(`Received request for file: ${filename}`);
//   console.log('Request headers:', req.headers);

//   // const decodedFilename = path.basename(filename);
//   // const filepath = path.join(UPLOAD_DIR, decodedFilename);
//   // console.log(`Looking for file at: ${filepath}`);
//     const params = {
//     Bucket: "eu-north-1",
//     Key: filename
//   };


//   try {
//     // if (!fs.existsSync(filepath)) {
//     //   console.log(`File not found: ${filepath}`);
//     //   return res.status(404).json({ detail: `File not found: ${decodedFilename}` });
//     // }

//     // if (!decodedFilename.toLowerCase().endsWith('.pdf')) {
//     //   console.log(`Invalid file type: ${decodedFilename}`);
//     //   return res.status(400).json({ detail: 'File is not a PDF' });
//     // }

//     // const fileSize = fs.statSync(filepath).size;
//     // console.log(`Serving PDF: ${decodedFilename} (${fileSize} bytes)`);

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
//     res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
//     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
//     res.setHeader('Pragma', 'no-cache');
//     res.setHeader('Expires', '0');
// this.s3 = new AWS.S3();
//     const fileStream =this.s3.getObject(params).createReadStream();
//   fileStream.on('error', err => {
//     console.error('S3 stream error:', err);
//     res.status(404).json({ error: 'File not found' });
//   });
//   fileStream.pipe(res);
// }
//  catch (err) {
//     console.error('Unexpected error:', err);
//     res.status(500).json({ detail: `Internal server error: ${err.message}` });
//   }
// });



router.post('/view',async (req,res)=>{

  const fileurl = req.body.filename;
  console.log("FILENAME: " , fileurl);
  try {
    const fileData = await s3Service.readS3File(fileurl);
    res.setHeader('Content-Type', 'application/pdf'); // or appropriate MIME type
    console.log(fileData);
    res.send(fileData);
  } catch (err) {
  console.log("Error: " ,err);
    res.status(500).json({ error: err.message });
  }
})






// Get processing status endpoint
router.get('/status/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // In a real implementation, this would check the actual processing status
    const status = await landingAIService.getProcessingStatus(documentId);
    
    res.json(status);

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Failed to get processing status',
      message: error.message 
    });
  }
});

module.exports = router;
