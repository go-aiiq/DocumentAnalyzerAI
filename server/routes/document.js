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

// Process document asynchronously with S3-based status tracking
async function processDocument(fileUrl, originalFilename, userId, projectName) {
  try {
    // Ensure extractedData directory exists in S3
    await s3Service.ensureExtractedDataDir(userId, projectName);
    
    // Save processing status
    await s3Service.saveProcessingStatus(userId, projectName, originalFilename, 'processing', {
      startTime: new Date().toISOString(),
      fileUrl: fileUrl,
      originalFilename: originalFilename
    });

    console.log('Processing document:', fileUrl);
    
    // Process the document
    const result = await landingAI.analyzeDocument(fileUrl);
    
    // Save successful result
    await s3Service.saveProcessingStatus(userId, projectName, originalFilename, 'json', {
      success: true,
      fileUrl: fileUrl,
      originalFilename: originalFilename,
      data: result
    });
    
    console.log('Document processed successfully');
    return { success: true, result };
    
  } catch (error) {
    console.error('Error processing document:', error);
    
    // Save error details
    await s3Service.saveProcessingStatus(userId, projectName, originalFilename, 'error', {
      success: false,
      error: error.message,
      stack: error.stack
    });
    
    return { success: false, error };
  }
}

// File upload endpoint
router.post('/upload', uploadMiddleware.single('file'), async (req, res) => {
  try {
    const userId = req.cookies.user_Id;
    const projName = req.body.folderName ? req.body.folderName : req.cookies.projectName;
    
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

    // Upload to S3
    const fileUrl = await s3Service.uploadFile(req.file, userId, projName);
    
    // Clean up local file after upload
    fs.unlinkSync(req.file.path);

    // Validate the returned URL
    if (!fileUrl || typeof fileUrl !== 'string') {
      throw new Error('Invalid file URL returned from S3 upload');
    }

    try {
      // Basic URL validation
      new URL(fileUrl);
    } catch (error) {
      throw new Error(`Invalid file URL format: ${fileUrl}`);
    }

    console.log(`Starting document processing for: ${req.file.originalname}`);
    
    // Check if document is already being processed
    const processingStatus = await s3Service.getProcessingStatus(userId, projName, req.file.originalname);
    if (processingStatus) {
      if (processingStatus.status === 'processing') {
        console.warn(`Document is already being processed: ${req.file.originalname}`);
      } else if (processingStatus.status === 'json') {
        console.warn(`Document was already processed successfully: ${req.file.originalname}`);
      } else if (processingStatus.status === 'error') {
        console.warn(`Document previously failed processing: ${req.file.originalname}`);
      }
      
      // For this implementation, we'll proceed with processing again
      // You might want to change this behavior based on your requirements
      console.log('Attempting to reprocess document...');
    }

    // Create a processing flag to prevent concurrent processing
    const processingId = Date.now().toString();
    await s3Service.saveProcessingStatus(userId, projName, req.file.originalname, 'processing', {
      processingId,
      startTime: new Date().toISOString(),
      fileUrl: fileUrl,
      originalFilename: req.file.originalname,
      status: 'processing'
    });

    // Start async processing with error handling
    let processCompleted = false;
    const processPromise = processDocument(
      { filename: fileUrl }, // Pass as object with filename property
      req.file.originalname, 
      userId, 
      projName, 
      processingId
    )
      .then(({ success, result, error }) => {
        processCompleted = true;
        if (success) {
          console.log(`Document processed successfully: ${req.file.originalname}`);
        } else {
          console.error(`Document processing failed: ${req.file.originalname}`, error);
        }
        return { success, result, error };
      })
      .catch(async (err) => {
        processCompleted = true;
        console.error('Error in document processing pipeline:', err);
        
        // Save error status if not already done
        try {
          await s3Service.saveProcessingStatus(userId, projName, req.file.originalname, 'error', {
            success: false,
            processingId,
            error: err.message,
            stack: err.stack,
            status: 'error',
            endTime: new Date().toISOString()
          });
        } catch (saveErr) {
          console.error('Failed to save error status:', saveErr);
        }
        
        return { success: false, error: err };
      });

    // Set a timeout to clean up if processing hangs
    const timeoutMs = 5 * 60 * 1000; // 5 minutes
    const timeoutPromise = new Promise(resolve => {
      setTimeout(async () => {
        if (!processCompleted) {
          console.error(`Processing timeout for document: ${req.file.originalname}`);
          try {
            await s3Service.saveProcessingStatus(userId, projName, req.file.originalname, 'error', {
              success: false,
              processingId,
              error: 'Processing timed out',
              status: 'error',
              endTime: new Date().toISOString()
            });
          } catch (err) {
            console.error('Failed to save timeout error status:', err);
          }
          resolve({ success: false, error: new Error('Processing timed out') });
        }
      }, timeoutMs);
    });

    // Race between processing and timeout
    Promise.race([processPromise, timeoutPromise]);

    // Immediately respond to client
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
