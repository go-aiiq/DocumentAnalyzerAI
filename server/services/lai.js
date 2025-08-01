const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const https = require('https');
require('dotenv').config();

// Custom error class for better error handling
class DocumentAnalysisError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DocumentAnalysisError';
    this.code = code || 'DOCUMENT_ANALYSIS_ERROR';
  }
}

class LandingAIService1 {
  constructor() {
    this.VA_API_KEY = process.env.LANDINGAI_API_KEY;
    // Use environment variable or fallback to temp directory
    this.basePdfPath = process.env.BASE_PDF_PATH || path.join(process.cwd(), 'temp');
    this.pdfName = 'document.pdf'; // Generic name for processed files

    this.schema = {
      type: "object",
      properties: {
        //Buyer Details
        BuyerName: { type: "string", description: "Name of the buyer" },
        BuyerEmail: { type: "string", description: "Email id of the buyer" },
        BuyerPhone: { type: "string", description: "Phone number of the buyer" },
        BuyerContactAddress: { type: "string", description: "Current address of the buyer" },
        AdditionalBuyerInfo: { type: "string", description: "Additional information about the buyer" },

        SellerName: { type: "string", description: "Name of the seller" },
        SellerEmail: { type: "string", description: "Email id of the seller" },
        SellerPhone: { type: "string", description: "Phone number of the seller" },
        SellerContactAddress: { type: "string", description: "Current address of the seller" },
        AdditionalSellerInfo: { type: "string", description: "Additional information about the seller" },

        DualRepresentation: { type: "boolean", description: "Is the buyer agent name and the seller agent name same?" },

        // Agents and Brokers
        BuyerAgentName: { type: "string", description: "Name of the buyer agent" },
        BuyerAgentEmail: { type: "string", description: "Email id of the buyer agent" },
        BuyerAgentCommission: { type: "number", description: "Buyer agent commission" },

        SellerAgentName: { type: "string", description: "Name of the seller agent" },
        SellerAgentEmail: { type: "string", description: "Email id of the seller agent" },
        SellerAgentCommission: { type: "number", description: "Seller agent commission" },

        //Property Details
        PropertyAddress: { type: "string", description: "Address of the property on sale" },
        PurchasePrice: { type: "number", description: "Property purchase price" },
        DownPayment: { type: "number", description: "Property down payment" },
        EarnestMoney: { type: "number", description: "Earnest money amount" },
        ParcelNumber: { type: "string", description: "County parcel or tax ID number for the property" },
        PropertyType: { type: "string", description: "Type of property (e.g., residential, commercial, condo)" },

        //Key Dates
        FinalAcceptanceDate: { type: "string", format: "YYYY-MM-DD", description: "Final acceptance date" },
        InspectionDate: { type: "string", format: "YYYY-MM-DD", description: "Inspection date" },
        InspectionTimeframe: { type: "string", description: "Property inspection timeframe" },
        WrittenStatementDate: { type: "string", format: "YYYY-MM-DD", description: "Date of written statement" },
        ClosingDate: { type: "string", format: "YYYY-MM-DD", description: "Property closing date" },
        OtherDates: { type: "string", description: "Other related dates" },
        OfferDate: { type: "string", format: "YYYY-MM-DD", description: "Date the purchase offer was made" },
        ContingencyRemovalDate: { type: "string", format: "YYYY-MM-DD", description: "Deadline to remove contingencies" },

        //Financial Details
        LenderName: { type: "string", description: "Name of the lender or lending company" },
        BuyerTitleCompany: { type: "string", description: "Name of the title company associated with the buyer" },
        SellerTitleCompany: { type: "string", description: "Name of the title company associated with seller, if any" },
        LoanApprovalDeadline: { type: "string", format: "YYYY-MM-DD", description: "Deadline for buyer loan approval" },
        AppraisalDate: { type: "string", format: "YYYY-MM-DD", description: "Date of the property appraisal" },

        //Additional Details
        HOAInfo: { type: "string", description: "Homeowner Association details, if applicable" },
        AdditionalNotes: { type: "string", description: "Additional notes related to buyer, seller, property, etc." }
      },
      required: [
        // Buyer Information
        "BuyerName", 
        "BuyerEmail", 
        "BuyerPhone", 
        "BuyerContactAddress", 
        "AdditionalBuyerInfo",
        
        // Seller Information
        "SellerName", 
        "SellerEmail", 
        "SellerPhone", 
        "SellerContactAddress", 
        "AdditionalSellerInfo", 
        
        // Agent Information
        "BuyerAgentName", 
        "BuyerAgentEmail", 
        "BuyerAgentCommission", 
        "SellerAgentName", 
        "SellerAgentEmail", 
        "SellerAgentCommission",
        
        // Property Information
        "PropertyAddress",
        "PurchasePrice",
        "DownPayment",
        "EarnestMoney",
        
        // Required Dates
        "FinalAcceptanceDate",
        "ClosingDate",
        "OfferDate",
        
        // Financial Information
        "LenderName",
        "BuyerTitleCompany",
        "SellerTitleCompany"
      ]
    };
  }

  /**
   * Analyzes a document from S3 using the Landing AI API
   * @param {Object|string} fileUrl - Object containing the S3 file URL or the URL string itself
   * @returns {Promise<Object>} - Extracted document information
   * @throws {DocumentAnalysisError} - Throws error if analysis fails
   */
  async analyzeDocument(fileUrl) {
    try {
      // Input validation
      if (!fileUrl) {
        throw new DocumentAnalysisError('File URL is required', 'INVALID_INPUT');
      }

      // Handle both object with filename property and direct string URL
      const fileUrlStr = typeof fileUrl === 'string' ? fileUrl : fileUrl.filename;
      
      if (!fileUrlStr) {
        throw new DocumentAnalysisError('Invalid file URL format. Expected string or object with filename property', 'INVALID_URL_FORMAT');
      }

      // Validate required environment variables
      if (!process.env.S3_BUCKET_NAME) {
        throw new DocumentAnalysisError('S3_BUCKET_NAME environment variable is not set', 'MISSING_ENV_VAR');
      }

      if (!this.VA_API_KEY) {
        throw new DocumentAnalysisError('LANDINGAI_API_KEY environment variable is not set', 'MISSING_API_KEY');
      }

      // Configure HTTPS agent with SSL verification based on environment
      const agent = new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV !== 'development',
      });

      console.log("Initiating document analysis for:", fileUrlStr);

      // Parse S3 URL and prepare request
      const url = new URL(String(fileUrlStr));
      const s3Key = decodeURIComponent(url.pathname.slice(1));
      
      const s3 = new AWS.S3({ 
        region: process.env.AWS_REGION || 'us-east-1',
        httpOptions: { timeout: 60000 } // 60 seconds timeout
      });

      // Fetch document from S3
      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key
      };

      console.log("Fetching document from S3:", s3Params.Bucket, s3Params.Key);
      const s3Object = await s3.getObject(s3Params).promise();
      const documentBuffer = s3Object.Body;

      // Prepare form data for API request
      const formData = new FormData();
      formData.append('pdf', documentBuffer, {
        filename: this.pdfName,
        contentType: 'application/pdf',
        knownLength: documentBuffer.length
      });
      formData.append('fields_schema', JSON.stringify(this.schema));

      // Make API request to Landing AI
      const response = await axios.post(
        'https://api.va.landing.ai/v1/tools/agentic-document-analysis',
        formData,
        {
          httpsAgent: agent,
          headers: {
            'Authorization': `Bearer ${this.VA_API_KEY}`,
            ...formData.getHeaders(),
            'Content-Length': formData.getLengthSync()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      if (!response?.data?.data?.extracted_schema) {
        throw new DocumentAnalysisError('Invalid response format from API', 'INVALID_RESPONSE');
      }

      return response.data.data.extracted_schema;

    } catch (error) {
      console.error('Document analysis failed:', {
        error: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      // Rethrow with appropriate error type
      if (error instanceof DocumentAnalysisError) {
        throw error;
      }

      // Handle specific AWS errors
      if (error.code === 'NoSuchKey') {
        throw new DocumentAnalysisError('Document not found in S3', 'DOCUMENT_NOT_FOUND');
      }

      if (error.code === 'RequestTimeout') {
        throw new DocumentAnalysisError('Request to document analysis service timed out', 'REQUEST_TIMEOUT');
      }

      // Handle axios errors
      if (error.response) {
        throw new DocumentAnalysisError(
          `API request failed with status ${error.response.status}: ${error.response.statusText}`,
          'API_REQUEST_FAILED'
        );
      }

      // Default error
      throw new DocumentAnalysisError(
        error.message || 'An unknown error occurred during document analysis',
        'ANALYSIS_FAILED'
      );
    }
  }
}

module.exports = new LandingAIService1();