# Great AI Hackathon - Medical AI Assistant

A comprehensive medical AI assistant application built with React that allows users to query medical documents, patient records, and clinical guides using AWS Bedrock AI services.

## 🚀 Features

### Core Functionality
- **AI-Powered Medical Queries**: Ask questions about medical documents using AWS Bedrock AI
- **Document Management**: Upload and manage PDF documents in AWS S3
- **Patient Records**: Query specific patient information from uploaded records
- **Clinical Guides**: Access and search through clinical guidelines and protocols
- **Chat History**: Persistent conversation history with session management
- **Source References**: Clickable links to original PDF documents used in AI responses

### User Interface
- **Modern React UI**: Built with Tailwind CSS for a clean, responsive design
- **Real-time Chat**: Interactive chat interface with message history
- **File Upload**: Drag-and-drop file upload with progress indicators
- **Source Modal**: View and access referenced documents with direct PDF links
- **Session Management**: Create, switch, and delete chat sessions

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Beautiful, customizable icons
- **AWS SDK v3**: JavaScript SDK for AWS services

### Backend Services
- **AWS Bedrock**: AI/ML service for natural language processing
- **AWS S3**: Object storage for document management
- **AWS DynamoDB**: NoSQL database for chat session storage
- **AWS Lambda**: Serverless compute for API endpoints

### Key Libraries
- `@aws-sdk/client-bedrock-runtime`: Bedrock AI model integration
- `@aws-sdk/client-s3`: S3 file operations
- `@aws-sdk/s3-request-presigner`: Secure URL generation
- `@aws-sdk/client-dynamodb`: Database operations

## 📁 Project Structure

```
GreatAIHackathon/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ChatMessage.js     # Individual chat message component
│   │   ├── FileList.js        # File listing and management
│   │   ├── FileUploadZone.js  # Drag-and-drop file upload
│   │   ├── Navigation.js      # Main navigation bar
│   │   ├── PromptInput.js     # Chat input component
│   │   ├── Sidebar.js         # Chat history sidebar
│   │   └── SourceModal.js     # PDF source reference modal
│   ├── pages/              # Main application pages
│   │   ├── AssistantPage.js   # Main chat interface
│   │   ├── UploadPage.js      # File upload interface
│   │   └── WelcomePage.js     # Landing page with document selection
│   ├── utils/              # Utility functions and API clients
│   │   ├── chatHistoryAPI.js  # Chat session management
│   │   ├── chatSessionsAPI.js # DynamoDB operations
│   │   ├── dynamodbConfig.js  # Database configuration
│   │   ├── medicalQueryAPI.js # Bedrock AI integration
│   │   └── s3Upload.js        # S3 file operations
│   ├── App.js              # Main application component
│   ├── index.js            # Application entry point
│   └── index.css           # Global styles
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- AWS Account with appropriate permissions
- AWS CLI configured (optional)

### Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# AWS Configuration
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_ACCESS_KEY_ID=your_access_key
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key

# AWS Services
REACT_APP_S3_BUCKET_NAME=your-s3-bucket-name
REACT_APP_BEDROCK_AGENT_ID=your-bedrock-agent-id
REACT_APP_BEDROCK_AGENT_ALIAS_ID=your-bedrock-agent-alias-id
REACT_APP_BEDROCK_MODEL_ID=amazon.nova-micro-v1:0

# DynamoDB
REACT_APP_DYNAMODB_TABLE_NAME=your-dynamodb-table
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GreatAIHackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS credentials and configuration
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### AWS Services Setup

#### 1. S3 Bucket
- Create an S3 bucket for document storage
- Configure appropriate CORS settings
- Set up IAM permissions for read/write access

#### 2. Bedrock AI
- Enable Bedrock service in your AWS account
- Create a Bedrock Agent with knowledge base
- Configure the agent with your S3 bucket as a data source

#### 3. DynamoDB
- Create a DynamoDB table for chat sessions
- Configure appropriate read/write capacity
- Set up IAM permissions for table access

### IAM Permissions
Your AWS user/role needs the following permissions:
- `s3:GetObject`, `s3:PutObject`, `s3:ListBucket`
- `bedrock:InvokeAgent`, `bedrock:InvokeModel`
- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:Query`, `dynamodb:Scan`

## 📖 Usage

### 1. Upload Documents
- Navigate to the Upload page
- Drag and drop PDF files or click to browse
- Files are automatically uploaded to S3

### 2. Start a Conversation
- Go to the Assistant page
- Type your medical question in the input field
- Press Enter or click Send

### 3. View Sources
- Click the "Source" button on AI responses
- View referenced PDF documents
- Click on document names to open PDFs directly

### 4. Manage Chat Sessions
- Create new chat sessions from the sidebar
- Switch between different conversations
- Delete old sessions as needed

## 🔍 Key Features Explained

### AI Integration
The application uses AWS Bedrock to process medical queries and provide intelligent responses based on uploaded documents. The AI can:
- Answer questions about medical procedures
- Provide information from patient records
- Reference clinical guidelines and protocols
- Cite specific documents used in responses

### Document Management
- **Upload**: Secure file upload to S3 with progress tracking
- **Storage**: Organized storage with metadata tracking
- **Access**: Presigned URLs for secure document access
- **References**: Direct links to source documents in AI responses

### Chat System
- **Persistence**: All conversations saved to DynamoDB
- **Sessions**: Multiple chat sessions with independent histories
- **Context**: AI maintains conversation context across messages
- **Sources**: Transparent source attribution for all responses

## 🛡️ Security Features

- **Presigned URLs**: Secure, time-limited access to S3 documents
- **IAM Permissions**: Least-privilege access to AWS services
- **Input Validation**: Sanitized user inputs and file uploads
- **Error Handling**: Graceful error handling with user-friendly messages

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
- Configure production environment variables
- Set up production AWS resources
- Configure domain and SSL certificates

### AWS Deployment Options
- **S3 + CloudFront**: Static site hosting
- **Amplify**: Full-stack deployment
- **ECS/Fargate**: Containerized deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the AWS documentation for service-specific questions
- Review the console logs for debugging information

## 🔮 Future Enhancements

- **Multi-language Support**: Internationalization for global users
- **Advanced Search**: Full-text search across all documents
- **User Authentication**: Secure user management and access control
- **Analytics Dashboard**: Usage statistics and insights
- **Mobile App**: React Native mobile application
- **API Integration**: RESTful API for third-party integrations

---

Built with ❤️ for the Great AI Hackathon