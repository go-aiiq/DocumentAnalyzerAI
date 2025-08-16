const AWS = require('aws-sdk');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const user = require('../server.js');
const fs = require('fs');
const { execFile } = require('child_process');
const muhammara =require('muhammara');
const archiver = require('archiver');

class S3Service {
  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME;
    this.region = process.env.AWS_REGION;
    
    // Validate required environment variables
    if (!this.bucketName || !this.region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('AWS credentials not found. Using mock S3 service.');
      this.mockMode = true;
    } else {
      this.mockMode = false;
      
      // Configure AWS SDK
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: this.region
      });
      
      this.s3 = new AWS.S3();
      console.log(`S3 Service initialized for bucket: ${this.bucketName} in region: ${this.region}`);
    }
  }

  async createFolder(userId,projectname){
    
      const folder =`${userId}/${projectname}/`;
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: folder,
        Body: '', // zero-byte object
      };
      try{
        const response = await this.s3.putObject(params).promise();
        console.log(response);
        //  res.json({ message: `Project '${folderName}' created!` }); 

    }
  
  catch(e){
    console.error('Error creating folder:', e);
    
    }
  }
  async uploadFile(file , userId , projectName) {
    try {
      // const fileKey = `documents/${uuidv4()}-${file.originalname}`;
      // parseCookies()
      // this.userId = cookies['userId'];
      // this.userid= user.userId;
      const fileKey = `${userId}/${projectName}/${file.originalname}`;
      console.log(`the file directory : ${userId}/${projectName}/${file.originalname}`);
      
      if (this.mockMode) {
        // Mock mode for development
        await this.delay(1000);
        const mockS3Url = `https://${this.bucketName || 'ta-ai-documents'}.s3.${this.region || 'us-east-1'}.amazonaws.com/${fileKey}`;
        console.log(`Mock S3 upload: ${file.originalname} -> ${mockS3Url}`);
        return mockS3Url;
      }
      
      // Real S3 upload
      const uploadParams = {
        Bucket: this.bucketName,
        Key: fileKey,
        Body: require('fs').readFileSync(file.path),
        ContentType: file.mimetype,
        // ACL removed - bucket has ACLs disabled, using bucket policy instead
        Metadata: {
          'original-name': file.originalname,
          'upload-time': new Date().toISOString(),
          'content-type': file.mimetype
        }
      };

      console.log(`Uploading to S3: ${file.originalname} -> ${fileKey}`);
      
      const result = await this.s3.upload(uploadParams).promise();
      console.log(`S3 upload successful: ${result.Location}`);
      // Ensure the file exists in S3 before returning the URL
      const headResult = await this.s3.headObject({ Bucket: this.bucketName, Key: fileKey }).promise();
      console.log("S3 object exists to continue processing it further:", headResult);
      // Generate a signed URL for the uploaded file
      const signedUrl = this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: fileKey,
        Expires: 60 * 15
      });

      console.log("Signed URL:", signedUrl);
      // Return the public URL of the uploaded file
      return signedUrl;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  // Ensure extracted data directory exists in S3
  async ensureExtractedDataDir(userId, projectName) {
    const key = `${userId}/${projectName}/extractedData/.keep`;
    try {
      await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
    } catch (error) {
      if (error.code === 'NotFound') {
        // Create the marker file
        await this.s3.putObject({
          Bucket: this.bucketName,
          Key: key,
          Body: '',
          ContentType: 'text/plain'
        }).promise();
      } else {
        throw error;
      }
    }
  }

  // Save processing status to S3
  async getProcessingStatus(userId, projectName, filename) {
    const baseName = path.basename(filename, path.extname(filename));
    const baseKey = `${userId}/${projectName}/extractedData/${baseName}`;
    
    // Check for different status files in order of priority
    const statuses = ['processing', 'json', 'error'];
    
    for (const status of statuses) {
      const key = `${baseKey}.${status}`;
      try {
        const result = await this.s3.getObject({
          Bucket: this.bucketName,
          Key: key
        }).promise();
        
        if (result.Body) {
          const data = JSON.parse(result.Body.toString());
          return {
            status,
            ...data,
            timestamp: result.LastModified?.toISOString() || new Date().toISOString()
          };
        }
      } catch (error) {
        if (error.code !== 'NoSuchKey') {
          console.error(`Error reading status file ${key}:`, error);
        }
      }
    }
    
    return null;
  }

  async saveProcessingStatus(userId, projectName, filename, status, data = {}) {
    const baseName = path.basename(filename, path.extname(filename));
    const statusKey = `${userId}/${projectName}/extractedData/${baseName}.${status}`;
    
    const statusData = {
      ...data,
      timestamp: new Date().toISOString(),
      status: status,
      lastUpdated: new Date().toISOString()
    };
    
    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: statusKey,
      Body: JSON.stringify(statusData),
      ContentType: 'application/json'
    }).promise();
    
    // If this is a completion status (json or error), clean up any .processing file
    if (['json', 'error'].includes(status)) {
      const processingKey = `${userId}/${projectName}/extractedData/${baseName}.processing`;
      try {
        await this.s3.deleteObject({
          Bucket: this.bucketName,
          Key: processingKey
        }).promise();
      } catch (error) {
        // Ignore if processing file doesn't exist
        if (error.code !== 'NoSuchKey') {
          console.error('Error cleaning up processing file:', error);
        }
      }
    }
    
    return statusData;
  }

  async getFilesFolderwise(userId) {
    const params = {
      Bucket: this.bucketName,
      Prefix: `${userId}/`
    };
    
    try {
      const data = await this.s3.listObjectsV2(params).promise();
      const folders = {};
      
      data.Contents.forEach(obj => {
        const parts = obj.Key.split('/');
        const subfolder = parts[1];

        if (!folders[subfolder]) folders[subfolder] = [];
        folders[subfolder].push({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          url: this.s3.getSignedUrl('getObject', {
            Bucket: this.bucketName,
            Key: obj.Key,
            Expires: 300
          })
        });
      });
      return folders;
      // res.json({ folders: folders });
    }
     catch(err){
      console.error('Error grouping files:', err);
      throw err;
      // res.status(500).json({ error: 'Failed to group files' });

  }
  }


  async readS3File(filename) {
  try {
    const decodedurl=decodeURIComponent(filename);

    console.log("Inside: ",decodedurl.split('/').slice(3).join('/'));
    const params = {
      Bucket: this.bucketName,
      // Prefix: 
      Key:  decodedurl.split('.amazonaws.com/')[1].split('?')[0]
    };

    // Use getObject if you want the file content as a Buffer
    // const data = await fetch(filename);
    const data = await this.s3.getObject(params).promise();

    console.log(`Successfully read ${filename} from S3` , data);
    return data; // This is a Buffer containing file data

  } catch (error) {
    console.error(`Failed to read file: ${filename}`, error);
    throw new Error(`Unable to retrieve file: ${error.message}`);
  }
}

  async getResults(folderPath,filename){
    // const urlParts = fileUrl.split('/');
      // const key = urlParts.slice(3).join('/');
      
    const params= {
      Bucket: this.bucketName,
      Prefix: `${folderPath}/`,
      MaxKeys:1
    }
    
    const param ={
      Bucket: this.bucketName,
      Key: `${folderPath}/${filename}.json`,
    }
    try{
      // const urlParts = fileUrl.split('/');
      // const key = urlParts.slice(3).join('/');
      // if (key.contains('extractedData')){
      await this.s3.headObject(param).promise();
        const resp = await this.s3.listObjectsV2(params).promise();
         
        if(resp.KeyCount){
          console.log("Bucket Exists");
          const response = await this.s3.getObject(param).promise();
          const fileContent = response.Body.toString('utf-8');
          console.log("Response: ", fileContent);
          return fileContent;
        }
        else{
          return false;
        }
      // }
    }
  
  catch(e){
    if (e.code === 'NotFound') {
    console.error("File does not exist in bucket.");
    return false;
  } else {
    console.error("Error checking file:", e.message);
  }
  console.log("Error ",e);
  return false;    
  }}
 
  async storeResults(folderPath,fileName,jsonString){
    try{
    const params = {
    Bucket: this.bucketName,
    Key: `${folderPath}extractedData/${fileName}.json`, // Unique filename
    Body: jsonString,
    ContentType: 'application/json'
  };
  const param={
    Bucket: this.bucketName,
    Key: `${folderPath}extractedData/${fileName}.json`,
  }
   const result = await this.s3.upload(params).promise();
  //  console.log(`message: Upload successful, ${result.Location} `);
  // return result.Body;
  const response = await this.s3.getObject(param).promise();
  return response.Body.toString('utf-8');

  
}catch(err){
console.log(`message: Unsuccessful Upload`, err );
}
}
  //store sections
  async storeSections(sections,fileurl){
    try{
      const decodedUrl = decodeURIComponent(fileurl);
      const match=decodedUrl.match(/amazonaws\.com\/([^?]+)/);
      const folderpathmatch = match ? match[1] : null;
      const folderpath=folderpathmatch.substring(0, folderpathmatch.lastIndexOf('/'))
      const filename =folderpathmatch.split('/').pop().replace(/\.pdf$/, "");

      const getParams = {
        Bucket: this.bucketName,
        Key: `${folderpath}/sections/${filename}.json`
        
      };

      let existingData = [];

      try {
        const data = await this.s3.getObject(getParams).promise();
         existingData = JSON.parse(data.Body.toString());
        
      } catch (error) {
          if (error.code === 'NoSuchKey') {
          console.log("Key not found..");
        } else {
          throw error; // Other errors should still bubble up
        }
      }
      

      // existingData = [existingData];
      let index = existingData.findIndex(existing => sections.title===existing.title && sections.startPage===existing.startPage && sections.endPage===existing.endPage)
      if(index<0){
        existingData.push(sections);
      }
      
      
      
      

      const params={
        Bucket: this.bucketName,
        Key: `${folderpath}/sections/${filename}.json`, // Unique filename
        Body: JSON.stringify(existingData, null, 2),
        ContentType: 'application/json'
      }
      const result = await this.s3.upload(params).promise();
      console.log("RESULT: " ,result);
      return result;
    }catch(e){
      console.log(`message: Unsuccessful Upload`, e );
    }
  }

  async getCreatedSections(fileurl) {
    try {
      if (!fileurl) {
        console.error('File URL is required');
        return [];
      }

      const decodedUrl = decodeURIComponent(fileurl);
      const match = decodedUrl.match(/amazonaws\.com\/([^?]+)/);
      
      if (!match || !match[1]) {
        console.error('Invalid S3 URL format');
        return [];
      }
      
      const folderpathmatch = match[1];
      const folderpath = folderpathmatch.substring(0, folderpathmatch.lastIndexOf('/'));
      const filename = folderpathmatch.split('/').pop()?.replace(/\.pdf$/, "") || '';

      const params = {
        Bucket: this.bucketName,
        Prefix: `${folderpath}/sections`,
        MaxKeys: 1
      }
    
    const param ={
      Bucket: this.bucketName,
      Key: `${folderpath}/sections/${filename}.json`,
    }
    try{
      
      await this.s3.headObject(param).promise();
        const resp = await this.s3.listObjectsV2(params).promise();
         
        if(resp.KeyCount){
          console.log("Bucket Exists");
          const response = await this.s3.getObject(param).promise();
          const fileContent = response.Body.toString('utf-8');
          console.log("Response: ", fileContent);
          return fileContent;
        }
        else{
          return false;
        }


  }catch(e){
    console.log(e);
  }
}catch(err){
  console.log(err);
  }}



async downloadAllSections(fileurl) {
  try {
    const decodedUrl = decodeURIComponent(fileurl);
    const match = decodedUrl.match(/amazonaws\.com\/([^?]+)/);

    if (!match || !match[1]) {
      console.error('Invalid S3 URL format');
      return [];
    }

    const folderpathmatch = match[1];
    const folderpath = folderpathmatch.substring(0, folderpathmatch.lastIndexOf('/'));
    const filename = folderpathmatch.split('/').pop()?.replace(/\.pdf$/, "") || '';
    const folderName = folderpath.split('/').pop();
    console.log(folderName);

    // Check if folder exists
    try {
      await this.s3.headObject({ Bucket: this.bucketName, Key: `${folderpath}/sections/${filename}.json` }).promise();
    } catch (err) {
      console.error("File doesn't exist or is inaccessible", err);
      return false;
    }

    const jsonData = await this.s3.getObject({ Bucket: this.bucketName, Key: `${folderpath}/sections/${filename}.json` }).promise();
    const sectionsData = JSON.parse(jsonData.Body.toString('utf-8'));

    const pdfKey =  `${folderpath}/${filename}.pdf`;
    const pdfData = await this.s3.getObject({ Bucket: this.bucketName, Key: pdfKey }).promise();
    fs.writeFileSync('source.pdf', pdfData.Body);

    
    const output = fs.createWriteStream(`${filename}_sections.zip`);
    const zip = archiver('zip', { zlib: { level: 9 } });
    zip.pipe(output);

    sectionsData.forEach((section, index) => {
    const { startPage, endPage, title } = section;
    const outputFilename = path.join(__dirname, `${folderName}_${title.replace(/[\/:*?"<>|\\]/g, '_') || 'section'}.pdf`);
    const outputPath = outputFilename.replace(/[\/:*?"<>|\\]/g, '_');

    const writer = muhammara.createWriter(outputPath);
    writer.appendPDFPagesFromPDF('source.pdf', { 
      type: muhammara.eRangeTypeSpecific,
      specificRanges: [[startPage - 1, endPage - 1]] // zero-based indexing
    });
    writer.end();

    zip.append(fs.createReadStream(outputPath), { name: `${folderName}_${title.replace(/[\/:*?"<>|\\]/g, '_') || 'section'}.pdf` });
  });

    zip.finalize();
    const zipBuffer = fs.readFileSync(`${filename}_sections.zip`);

    console.log(' PDF sections extracted and zipped successfully.');
    
      await this.s3.putObject({
    Bucket: this.bucketName,
    Key: `${folderpath}/sectionsPDF/${filename}_sections.zip`,
    Body: zipBuffer,
    ContentType: 'application/pdf'
  }).promise();
 
    const url =  this.s3.getSignedUrl('getObject', {
    Bucket: this.bucketName,
    Key: `${folderpath}/sectionsPDF/${filename}_sections.zip`,
    Expires: 60 * 15,
    ResponseContentDisposition: `attachment; filename="${filename}_sections.zip"`
  })
  const allsectionsZip=`${filename}_sections.zip`;
  return {url,allsectionsZip};
   
  } catch (e) {
    console.log("Error downloading all sections", e);
  }
}



  async deleteFile(fileUrl) {
    try {
      if (this.mockMode) {
        // Mock mode for development
        await this.delay(500);
        console.log(`Mock S3 delete: ${fileUrl}`);
        return true;
      }
      
      // Extract key from S3 URL
      const urlParts = fileUrl.split('/');
      const key = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
      
      const deleteParams = {
        Bucket: this.bucketName,
        Key: fileUrl
      };

      console.log(`Deleting from S3: ${key}`);
      
      await this.s3.deleteObject(deleteParams).promise();
      
      console.log(`S3 delete successful: ${key}`);
      return true;

    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  async getFileMetadata(fileUrl) {
    try {
      // Simulate metadata retrieval
      await this.delay(300);

      return {
        url: fileUrl,
        size: Math.floor(Math.random() * 1000000) + 100000, // Random size
        lastModified: new Date().toISOString(),
        contentType: 'application/pdf',
        etag: `"${uuidv4()}"`,
        versionId: uuidv4()
      };

    } catch (error) {
      console.error('S3 metadata error:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  async generatePresignedUrl(fileUrl, expiresIn = 60 * 15) {
    try {
      if (this.mockMode) {
        // Mock mode for development
        await this.delay(200);
        const timestamp = Date.now();
        const signature = uuidv4();
        const presignedUrl = `${fileUrl}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock&X-Amz-Date=${timestamp}&X-Amz-Expires=${expiresIn}&X-Amz-Signature=${signature}`;
        return presignedUrl;
      }
      
      // Extract key from S3 URL
      const urlParts = fileUrl.split('/');
      const key = urlParts.slice(3).join('/'); // Remove https://bucket.s3.region.amazonaws.com/
      
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      };

      console.log(`Generating presigned URL for: ${key}`);
      
      const presignedUrl = await this.s3.getSignedUrlPromise('getObject', params);
      
      console.log(`Presigned URL generated successfully`);
      return presignedUrl;

    } catch (error) {
      console.error('Presigned URL generation error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async deleteFolder(userId, folderName) {
    const folderPath = `${userId}/${folderName}/`;
    let totalDeleted = 0;
    let isTruncated = true;
    let continuationToken = null;
    
    if (this.mockMode) {
      await this.delay(500);
      console.log(`Mock S3 folder delete: ${folderPath}`);
      return { 
        deleted: true, 
        message: `Folder '${folderPath}' deleted successfully`,
        filesDeleted: 10 // Mock value
      };
    }

    try {
      console.log(`Starting deletion of folder: ${folderPath}`);
      
      // Keep deleting in batches until all objects are processed
      while (isTruncated) {
        // List objects in the folder with pagination
        const listParams = {
          Bucket: this.bucketName,
          Prefix: folderPath,
          ContinuationToken: continuationToken
        };
        
        console.log(`Listing objects with params:`, JSON.stringify(listParams, null, 2));
        const listedObjects = await this.s3.listObjectsV2(listParams).promise();
        
        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
          if (totalDeleted === 0) {
            console.log(`No objects found in folder: ${folderPath}`);
            return { 
              deleted: false, 
              message: 'Folder is empty or does not exist',
              filesDeleted: 0
            };
          }
          break;
        }

        // Prepare delete parameters for this batch
        const deleteParams = {
          Bucket: this.bucketName,
          Delete: { 
            Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
            Quiet: false
          }
        };

        console.log(`Deleting batch of ${listedObjects.Contents.length} objects`);
        const deleteResult = await this.s3.deleteObjects(deleteParams).promise();
        
        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          console.error('Errors during deletion:', deleteResult.Errors);
          throw new Error(`Failed to delete some objects: ${JSON.stringify(deleteResult.Errors)}`);
        }
        
        totalDeleted += listedObjects.Contents.length;
        console.log(`Successfully deleted ${listedObjects.Contents.length} objects (total: ${totalDeleted})`);
        
        // Check if there are more objects to delete
        isTruncated = listedObjects.IsTruncated || false;
        continuationToken = listedObjects.NextContinuationToken;
      }

      if (totalDeleted === 0) {
        console.log(`No objects found in folder: ${folderPath}`);
        return { 
          deleted: false, 
          message: 'Folder is empty or does not exist',
          filesDeleted: 0
        };
      }

      console.log(`Successfully deleted folder: ${folderPath}. Total files deleted: ${totalDeleted}`);
      return { 
        deleted: true, 
        message: `Folder '${folderPath}' and its contents (${totalDeleted} files) deleted successfully`,
        filesDeleted: totalDeleted
      };
    } catch (error) {
      console.error(`Error deleting folder ${folderPath}:`, error);
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  async deleteSection(fileurl,section){
    
    try{
       //Convert stream to string
    const streamToString = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};

//Deep isEqual cehck
const isEqual = (a, b) => {
  return JSON.stringify(a) === JSON.stringify(b);
};

    // Get the file
      const decodedUrl = decodeURIComponent(fileurl);
      console.log("fileurl: ",fileurl);
      console.log("decodedUrl: ",decodedUrl)
      const match=decodedUrl.match(/amazonaws\.com\/([^?]+)/);
      const folderpathmatch = match ? match[1] : null;
      const folderpath=folderpathmatch.substring(0, folderpathmatch.lastIndexOf('/'))
      const filename =folderpathmatch.split('/').pop().replace(/\.pdf$/, "");
      const fileKey= `${folderpath}/sections/${filename}.json`
      
    const getCommand = {
      Bucket: this.bucketName,
      Key: fileKey,
    };
    const response = await this.s3.getObject(getCommand).promise();
    const fileContent = response.Body.toString('utf-8');

    //Parse
    const jsonArray = JSON.parse(fileContent);
    const updatedArray = jsonArray.filter(obj => !isEqual(obj, section));

    // Write updated array back to S3
    const putCommand = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: JSON.stringify(updatedArray, null, 2),
      ContentType: "application/json",
    };
    const r = await this.s3.putObject(putCommand).promise();
    return r;
  }

    catch(e){
      console.log(e);
    }
   
}


async updateSection(fileurl,section){
  try{
    // Get the file
    const decodedUrl = decodeURIComponent(fileurl);
    console.log("fileurl: ",fileurl);
    console.log("decodedUrl: ",decodedUrl)
    const match=decodedUrl.match(/amazonaws\.com\/([^?]+)/);
    const folderpathmatch = match ? match[1] : null;
    const folderpath=folderpathmatch.substring(0, folderpathmatch.lastIndexOf('/'))
    const filename =folderpathmatch.split('/').pop().replace(/\.pdf$/, "");
    const fileKey= `${folderpath}/sections/${filename}.json`;
      
    const getCommand = {
      Bucket: this.bucketName,
      Key: fileKey,
    };

    const response = await this.s3.getObject(getCommand).promise();
    const fileContent = response.Body.toString('utf-8');

    //Parse
    const jsonArray = JSON.parse(fileContent);
    const updatedArray = jsonArray.map(obj => ( obj.title === section.title)?section:obj);
    console.log("UpdatedArray: ",updatedArray);
    const exists = jsonArray.some(obj =>
      obj.title === section.title ||
      (obj.startPage === section.startPage && obj.endPage === section.endPage)
    );
    if (!exists) {
      updatedArray.push(section);
    }

    // Write updated array back to S3
    const putCommand = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: JSON.stringify(updatedArray, null, 2),
      ContentType: "application/json",
    };
    const r = await this.s3.putObject(putCommand).promise();
    return r;
  }

  catch(e){
    console.log(e);
  }
}


async downloadSection(fileurl,section){
try{

  // Get file and folder path
  const decodedUrl = decodeURIComponent(fileurl);
  const match = decodedUrl.match(/amazonaws\.com\/([^?]+)/);
  const folderpathmatch = match? match[1] : null;
  const folderpath = folderpathmatch.substring(0, folderpathmatch.lastIndexOf('/'))
  const folderName=folderpath.split('/').pop();
  if (!match || !match[1]) {
  console.error('Invalid S3 URL format');
  return [];
  }
  const fileKey= decodedUrl.split('.amazonaws.com/')[1].split('?')[0];

  //Get page Range
  const startPage = section.startPage;
  const endPage = section.endPage;
  const pageRange = [startPage-1,endPage-1];
  const inputPath=path.join(__dirname, 'input.pdf');
  console.log(pageRange);

  // Get pdf doc
      const inputPdf = await this.s3.getObject({ Bucket: this.bucketName, Key: fileKey }).promise();
      fs.writeFileSync(inputPath, inputPdf.Body);
      const pdfReader = muhammara.createReader(inputPath);
      const totalPages = pdfReader.getPagesCount();
      // for (const pageIndex of pageRange) {
      const outputFilename = `${folderName}_${section.title}.pdf`;      
      const outputPath = outputFilename.replace(/[\/:*?"<>|\\]/g, '_');
      const pdfWriter = muhammara.createWriter(outputPath);
      const copyingContext = pdfWriter.createPDFCopyingContext(pdfReader);

      for (let i = startPage-1; i <= endPage-1 && i < totalPages; i++) {
      copyingContext.appendPDFPageFromPDF(i);
      }
      pdfWriter.end();

      const fileBuffer = fs.readFileSync(outputPath);
      



  await this.s3.putObject({
    Bucket: this.bucketName,
    Key: `${folderpath}/sectionsPDF/${outputFilename}`,
    Body: fileBuffer,
    ContentType: 'application/pdf'
  }).promise();
 
    const url =  this.s3.getSignedUrl('getObject', {
    Bucket: this.bucketName,
    Key: `${folderpath}/sectionsPDF/${outputFilename}`,
    Expires: 60 * 15,
    ResponseContentDisposition: `attachment; filename="${outputFilename}"`
  })
  const sectionPDF=`${outputFilename}`;
  return {url,sectionPDF};
}
catch(e){
  console.log("Error downloading Section: ",e)
}
}
}

module.exports = new S3Service();
