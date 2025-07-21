const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const https = require('https');

require('dotenv').config();

class LandingAIService1 {
  constructor() {
    this.VA_API_KEY = process.env.LANDINGAI_API_KEY;
    this.basePdfPath = "C:/Users/Anjhana/Desktop";
    this.pdfName = "sample-pdf-1.pdf";
    this.pdfPath = path.join(this.basePdfPath, this.pdfName);

    this.schema = {
      type: "object",
      properties: {
        BuyerAgentName: { type: "string", description: "Name of the buyer agent" },
        BuyerAgentEmail: { type: "string", description: "Email id of the buyer agent" },
        SellerAgentName: { type: "string", description: "Name of the seller agent" },
        SellerAgentEmail: { type: "string", description: "Email id of the seller agent" },
        PropertyAddress: { type: "string", description: "Address of the property on sale" },
        DualRepresentation: { type: "boolean", description: "Is the buyer agent name and the seller agent name same?" },
        BuyerName: { type: "string", description: "Name of the buyer" },
        BuyerEmail: { type: "string", description: "Email id of the buyer" },
        BuyerPhone: { type: "string", description: "Phone number of the buyer" },
        BuyerContactAddress: { type: "string", description: "Current address of the buyer" },
        SellerName: { type: "string", description: "Name of the seller" },
        SellerEmail: { type: "string", description: "Email id of the seller" },
        SellerPhone: { type: "string", description: "Phone number of the seller" },
        SellerContactAddress: { type: "string", description: "Current address of the seller" },
        AdditonalBuyerInfo: { type: "string", description: "Additional information about the buyer" },
        AdditionalSellerInfo: { type: "string", description: "Additional information about the seller" },
        FinalAcceptanceDate: { type: "string", format: "YYYY-MM-DD", description: "Final acceptance date" },
        LenderName: { type: "string", description: "Name of the lender or lending company" },
        SellerTitleCompany: { type: "string", description: "Name of the title company associated with seller, if any" },
        BuyerTitleCompany: { type: "string", description: "Name of the title company associated with the buyer" },
        BuyerAgentCommission: { type: "number", description: "Buyer agent commission" },
        SellerAgentCommission: { type: "number", description: "Seller agent commission" },
        AdditonalNotes: { type: "string", description: "Additional notes related to buyer, seller, property, etc." },
        InspectionDate: { type: "string", format: "YYYY-MM-DD", description: "Inspection date" },
        InspectionTimeframe: { type: "string", description: "Property inspection timeframe" },
        WrittenStatementDate: { type: "string", format: "YYYY-MM-DD", description: "Date of written statement" },
        OtherDates: { type: "string", description: "Other related dates" }
      },
      required: [
        "BuyerAgentName", "BuyerAgentEmail", "SellerAgentName", "SellerAgentEmail",
        "PropertyAddress", "DualRepresentation", "BuyerName", "BuyerEmail", "BuyerPhone",
        "BuyerContactAddress", "SellerName", "SellerEmail", "SellerPhone", "SellerContactAddress",
        "AdditonalBuyerInfo", "AdditionalSellerInfo", "FinalAcceptanceDate", "LenderName",
        "SellerTitleCompany", "BuyerTitleCompany", "BuyerAgentCommission", "SellerAgentCommission",
        "AdditonalNotes", "InspectionDate", "InspectionTimeframe", "WrittenStatementDate", "OtherDates"
      ]
    };
  }

  async analyzeDocument(fileUrl) {
    try {
        const agent = new https.Agent({
        rejectUnauthorized: false  //disables SSL verification
    });


    console.log("Analyzing document at:", fileUrl);

    const url = new URL(String(fileUrl.filename));
    // const url= String(fileUrl.filename);
    const pathname = url.pathname;
    //   const s3Key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        const s3Key = decodeURIComponent(url.pathname.slice(1));
      const s3 = new AWS.S3({ region: process.env.AWS_REGION || "eu-north-1" });

      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key
      };

      console.log("Fetching from S3:", s3Params);
      const s3Object = await s3.getObject(s3Params).promise();

      const documentBuffer = s3Object.Body;

      const formdata = new FormData();
      formdata.append('pdf', documentBuffer, {
        filename: this.pdfName,
        contentType: 'application/pdf'
      });
      formdata.append('fields_schema', JSON.stringify(this.schema));
      console.log("Before Response ",formdata);
      const response = await axios.post(
        'https://api.va.landing.ai/v1/tools/agentic-document-analysis',
        formdata,
        {
          httpsAgent: agent,
          headers: {
            'Authorization': `Bearer ${this.VA_API_KEY}`,
            ...formdata.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      const extractedInfo = response.data.data.extracted_schema;
      console.log("Extracted Info:", JSON.stringify(extractedInfo, null, 2));
      return extractedInfo;
    } catch (error) {
      console.error('Error analyzing document:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new LandingAIService1();