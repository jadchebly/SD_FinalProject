# IEstagram - Social Media Platform

A full-stack social media application built with React and Express, featuring user authentication, post creation, likes, comments, and user following capabilities. The application allows users to create and share posts (text, images, and videos), interact with content through likes and comments, and build connections by following other users.

## Features

- **User Authentication**: Secure signup and login with email/password
- **Post Creation**: Create posts with text, images (upload or capture), and YouTube video links
- **Feed Management**: View personalized feed with posts from followed users
- **Content Interaction**: Like/unlike posts and add comments
- **User Discovery**: Follow/unfollow users and discover suggested users
- **Feed Filtering**: Sort posts by most recent or most liked
- **Search**: Search posts by title or content
- **User Profiles**: View user profiles with follower/following counts
- **Image Uploads**: Upload images to AWS S3 (5MB limit)
- **Real-time Updates**: Socket.io-powered real-time updates for comments, likes, and new posts
- **Real-time Updates**: Feed automatically refreshes when following relationships change

## Technology Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server with fast HMR (Hot Module Replacement)
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **DaisyUI** - Tailwind CSS component library
- **React Icons** - Icon library
- **Socket.io Client** - Real-time communication with backend
- **Timeago React** - Relative time formatting
- **Vitest** - Testing framework
- **Testing Library** - React component testing utilities

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Relational database (via `pg` library)
- **AWS S3** - Image file storage
- **AWS Secrets Manager** - Secure credential management
- **Socket.io** - Real-time bidirectional communication
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing
- **Nodemon** - Development server with hot reload
- **ts-node** - TypeScript execution for Node.js
- **Application Insights** - Azure telemetry and monitoring (optional)

### Database & Storage
- **PostgreSQL** - Relational database (supports AWS RDS, Azure PostgreSQL, or local PostgreSQL)
- **AWS S3** - Image file storage
- **Socket.io** - Real-time updates for likes, comments, and new posts

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- **PostgreSQL Database** - Either:
  - Local PostgreSQL installation, or
  - AWS RDS PostgreSQL instance, or
  - Azure PostgreSQL instance
- **AWS Account** (for S3 storage) - [Sign up](https://aws.amazon.com/) (free tier available)
  - AWS S3 bucket for image storage
  - Optional: AWS Secrets Manager for database credentials

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SD_FinalProject
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up Database**
   - Set up a PostgreSQL database (local, AWS RDS, or Azure PostgreSQL)
   - Create the required database tables (users, posts, likes, comments, follows)
   - Ensure foreign key relationships and cascade delete rules are set up
   - See Database Schema section for table structure

5. **Set up AWS S3 (for image storage)**
   - Create an AWS S3 bucket for image uploads
   - Configure bucket policy for public read access (if needed)
   - Note down your AWS region, bucket name, and credentials
   - Optional: Set up IAM role for EC2/Lambda if deploying to AWS

## Environment Variables

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration (choose one option)

# Option 1: Direct PostgreSQL connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_SSL=false

# Option 2: Azure PostgreSQL (for staging)
# AZURE_POSTGRESQL_HOST=your-azure-postgresql-host.postgres.database.azure.com
# AZURE_POSTGRESQL_PORT=5432
# AZURE_POSTGRESQL_DATABASE=your_database_name
# AZURE_POSTGRESQL_USER=your_azure_user
# AZURE_POSTGRESQL_PASSWORD=your_azure_password
# AZURE_POSTGRESQL_SSL=true

# Option 3: AWS RDS with Secrets Manager (for production)
# DB_SECRET_ARN=arn:aws:secretsmanager:region:account:secret:name
# AWS_REGION=eu-north-1
# AWS_ACCESS_KEY_ID=your_aws_access_key (optional if using IAM role)
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key (optional if using IAM role)

# AWS S3 Configuration
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
FRONTEND_URL_STAGING=http://your-staging-url.azurestaticapps.net
FRONTEND_URL_PRODUCTION=http://your-production-url.azurestaticapps.net

# Optional: Azure Application Insights (for monitoring)
# APPLICATIONINSIGHTS_CONNECTION_STRING=your_connection_string
```

### Frontend Configuration

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=http://localhost:3000
```

**Note**: The `.env` files are already in `.gitignore` and should not be committed to version control.

## Project Structure

```
SD_FinalProject/
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI/CD pipeline
├── backend/                 # Express API server
│   ├── src/
│   │   ├── app.ts          # Main Express application with all routes
│   │   ├── config/
│   │   │   └── database.ts  # PostgreSQL database configuration
│   │   └── services/
│   │       └── s3Service.ts  # AWS S3 image upload service
│   ├── package.json
│   ├── tsconfig.json
│   └── .gitignore
├── src/                     # React frontend
│   ├── components/          # Reusable React components
│   │   ├── Dashboard/       # Dashboard component and Navbar
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Dashboard.css
│   │   │   └── Navbar/
│   │   │       ├── Navbar.tsx
│   │   │       └── Navbar.css
│   │   ├── ProtectedRoute.tsx
│   │   ├── SuggestedUsersModal.tsx
│   │   └── SuggestedUsersModal.css
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   ├── pages/               # Page components
│   │   ├── __tests__/       # Test files
│   │   │   ├── Login.test.tsx
│   │   │   └── SignUp.test.tsx
│   │   ├── Login.tsx
│   │   ├── Login.css
│   │   ├── SignUp.tsx
│   │   ├── SignUp.css
│   │   ├── CreatePost.tsx
│   │   ├── CreatePost.css
│   │   ├── Profile.tsx
│   │   └── Profile.css
│   ├── services/
│   │   ├── api.ts          # API service layer
│   │   └── socket.ts       # Socket.io client service
│   ├── test/
│   │   └── setup.ts        # Test configuration
│   ├── types/
│   │   └── Post.ts         # TypeScript type definitions
│   ├── App.tsx             # Main App component
│   ├── main.tsx            # Application entry point
│   └── style.css           # Global styles
├── public/                  # Static assets
├── coverage/                # Test coverage reports (generated)
├── package.json
├── vite.config.ts          # Vite configuration with test setup
├── tailwind.config.js      # TailwindCSS configuration
├── tsconfig.json
├── .gitignore
└── README.md
```

## Running the Application

The application requires both the frontend and backend to be running simultaneously.

### Step 1: Start the Backend Server

Open a terminal and navigate to the backend directory:

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:3000` (or the port specified in your `.env` file).

**What to expect:**
- You should see output like:
  ```
  Server running on http://localhost:3000
  Health check: http://localhost:3000/health
  Database test: http://localhost:3000/test-db
  ```
- The server uses **nodemon** for hot reload, so any changes to backend files will automatically restart the server
- If you see errors about missing environment variables, check your `backend/.env` file

**Verify backend is running:**
- Open `http://localhost:3000/health` in your browser
- You should see: `{"status":"ok","message":"Backend is running!"}`

### Step 2: Start the Frontend Development Server

Open a **new terminal** (keep the backend running) and navigate to the project root:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` (or another available port if 5173 is taken).

**What to expect:**
- You should see output like:
  ```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ```
- The frontend uses **Vite** for fast HMR (Hot Module Replacement), so changes will appear instantly in the browser
- If you see errors about API connection, verify that:
  - Backend is running on port 3000
  - `VITE_API_URL` in your root `.env` file matches the backend URL

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

You should see the login page. From here, you can:
- Sign up for a new account
- Log in with existing credentials
- Access the dashboard and other features

## Testing

The project uses **Vitest** as the testing framework with React Testing Library for component testing.

### Running Tests

All test commands should be run from the **project root directory**:

#### Run all tests once:
```bash
npm test
```
This runs all tests and exits. Use this for CI/CD or when you want a quick test run.

#### Run tests in watch mode:
```bash
npm run test:watch
```
This runs tests in watch mode - tests will re-run automatically when you change files. This is ideal for development.

#### Run tests with coverage report:
```bash
npm run test:coverage
```
This runs all tests and generates a coverage report showing:
- Line coverage
- Function coverage
- Branch coverage
- Statement coverage

Coverage reports are generated in the `coverage/` directory. Open `coverage/index.html` in your browser to view a detailed HTML report.

#### Open Vitest UI:
```bash
npm run test:ui
```
This opens an interactive test UI in your browser where you can:
- See all tests
- Run individual tests
- View test results and coverage
- Debug test failures

### Test Files Location

Test files are located in:
- `src/pages/__tests__/` - Page component tests
  - `Login.test.tsx`
  - `SignUp.test.tsx`

### Test Configuration

- Test framework: Vitest with jsdom environment
- Test setup file: `src/test/setup.ts`
- Test files pattern: `**/*.{test,spec}.{js,ts,jsx,tsx}`
- Coverage provider: v8

## Available Scripts

### Frontend Scripts

Run these commands from the **project root**:

- `npm run dev` - Start the Vite development server with HMR
- `npm run build` - Build the application for production (TypeScript compilation + Vite build)
- `npm run preview` - Preview the production build locally
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Open Vitest UI in the browser
- `npm run test:coverage` - Run tests with coverage report

### Backend Scripts

Run these commands from the **`backend/` directory**:

- `npm run dev` - Start the development server with hot reload (nodemon + ts-node)
  - Automatically restarts on file changes
  - Runs TypeScript directly without compilation
  - Starts both Express server and Socket.io server
- `npm run build` - Compile TypeScript to JavaScript
  - Output goes to `backend/dist/` directory
- `npm start` - Start the production server (requires build first)
  - Runs the compiled JavaScript from `dist/app.js`
- `npm test` - Run backend tests (Jest)
- `npm run test:s3` - Test S3 connection

## Project Flows

### Authentication Flow

1. **Sign Up**
   - User navigates to `/signup`
   - Enters username, email, and password
   - Frontend sends POST request to `/api/signup`
   - Backend creates user in PostgreSQL database
   - User is redirected to dashboard

2. **Login**
   - User navigates to `/login`
   - Enters email and password
   - Frontend sends POST request to `/api/login`
   - Backend validates credentials
   - User data is stored in localStorage
   - User is redirected to dashboard

3. **Protected Routes**
   - Routes like `/dashboard`, `/create-post`, and `/profile` are protected
   - `ProtectedRoute` component checks authentication status
   - Unauthenticated users are redirected to `/login`

### Post Creation Flow

1. User clicks "Create Post" button (plus icon in navbar)
2. User fills in post details:
   - Title (required)
   - Content (required)
   - Post type: Blurb, Photo, or Video
   - For Photo: Upload image or capture from camera
   - For Video: Enter YouTube link
3. Frontend sends POST request to `/api/posts` with image upload to `/api/upload` if needed
4. Backend creates post in database and stores image in AWS S3
5. User is redirected to dashboard to see their new post

### Feed Interaction Flow

1. **Viewing Feed**
   - Dashboard loads and fetches feed from `/api/feed`
   - Backend returns posts from followed users + own posts
   - Posts are sorted by most recent (default) or most likes

2. **Liking a Post**
   - User clicks like button on a post
   - Frontend sends POST request to `/api/posts/:id/like`
   - Backend creates like record in database
   - Backend emits Socket.io event to update all clients viewing the post
   - UI updates immediately to show new like count (via Socket.io event)

3. **Commenting on a Post**
   - User clicks comment button or opens post modal
   - User types comment and submits
   - Frontend sends POST request to `/api/posts/:id/comments`
   - Backend creates comment record
   - Backend emits Socket.io event to all clients viewing the post
   - Comment appears instantly in the post's comment section (via Socket.io event)

4. **Filtering and Sorting**
   - User can toggle between "Most Recent" and "Most Likes"
   - Sort preference is saved to localStorage
   - User can search posts by title or content
   - Search and sort work together

### User Following Flow

1. **Discovering Users**
   - New users with 0 followers see suggested users modal
   - Modal shows users they can follow
   - User can follow directly from the modal

2. **Following a User**
   - User navigates to another user's profile
   - Clicks "Follow" button
   - Frontend sends POST request to `/api/follow/:userId`
   - Backend creates follow relationship
   - Feed automatically refreshes to include new user's posts

3. **Unfollowing a User**
   - User clicks "Unfollow" button on profile
   - Frontend sends DELETE request to `/api/follow/:userId`
   - Backend removes follow relationship
   - Feed refreshes to remove that user's posts

## API Endpoints

All API endpoints are prefixed with `/api/` and run on the backend server (default: `http://localhost:3000`).

### Authentication

- `POST /api/signup` - Create a new user account
  - Body: `{ username, email, password }`
  - Returns: `{ success: true, user: { id, username, email, avatar } }`

- `POST /api/login` - Authenticate user
  - Body: `{ email, password }`
  - Returns: `{ success: true, user: { id, username, email, avatar } }`

- `GET /api/me` - Get current user information
  - Headers: `x-user-id: <user_id>` (optional, can also use session cookie)
  - Returns: `{ success: true, user: { ... } }` or `{ success: true, user: null }`

- `POST /api/logout` - Logout user (client-side, clears localStorage)
  - Returns: `{ success: true }`

### Posts

- `GET /api/feed` - Get user's personalized feed
  - Headers: `x-user-id: <user_id>` (required)
  - Returns: `{ success: true, posts: [...] }`
  - Returns posts from followed users + own posts, sorted by most recent

- `GET /api/posts` - Get all posts (optionally filtered by user)
  - Query params: `?user_id=<user_id>` (optional)
  - Returns: `{ success: true, posts: [...] }`

- `POST /api/posts` - Create a new post
  - Headers: `x-user-id: <user_id>` (required)
  - Body: `{ title, content, type, image_url?, video_url?, user_id, username }`
  - Returns: `{ success: true, post: { ... } }`

- `PUT /api/posts/:id` - Update a post
  - Headers: `x-user-id: <user_id>` (required)
  - Body: `{ title, content }`
  - Returns: `{ success: true, post: { ... } }`
  - Note: Only the post owner can update their posts

- `DELETE /api/posts/:id` - Delete a post
  - Headers: `x-user-id: <user_id>` (required)
  - Returns: `{ success: true, message: 'Post deleted successfully' }`
  - Note: Only the post owner can delete their posts. Also deletes associated image from AWS S3.

### Interactions

- `POST /api/posts/:id/like` - Like a post
  - Headers: `x-user-id: <user_id>` (required)
  - Returns: `{ success: true, message: 'Post liked' }`

- `DELETE /api/posts/:id/like` - Unlike a post
  - Headers: `x-user-id: <user_id>` (required)
  - Returns: `{ success: true, message: 'Post unliked' }`

- `GET /api/posts/:id/comments` - Get comments for a post
  - Returns: `{ success: true, comments: [...] }`

- `POST /api/posts/:id/comments` - Add a comment to a post
  - Headers: `x-user-id: <user_id>` (required)
  - Body: `{ text }`
  - Returns: `{ success: true, comment: { ... } }`

### Users

- `GET /api/users/:id` - Get user profile
  - Headers: `x-user-id: <current_user_id>` (optional)
  - Returns: `{ success: true, user: { id, username, email, avatar_url, followerCount, followingCount, isFollowing } }`

- `GET /api/users/search/:query` - Search users by username
  - Headers: `x-user-id: <user_id>` (optional)
  - Returns: `{ success: true, users: [...] }`
  - Returns up to 10 matching users

- `GET /api/users/suggested` - Get suggested users to follow
  - Headers: `x-user-id: <user_id>` (required)
  - Returns: `{ success: true, users: [...] }`
  - Returns up to 5 suggested users (excluding current user and already followed users)

- `GET /api/users/:id/followers` - Get user's followers
  - Returns: `{ success: true, users: [...] }`

- `GET /api/users/:id/following` - Get users that a user follows
  - Returns: `{ success: true, users: [...] }`

- `PUT /api/users/:id/avatar` - Update user avatar
  - Headers: `x-user-id: <user_id>` (required)
  - Body: `{ avatar_url }`
  - Returns: `{ success: true, user: { ... } }`
  - Note: Only the user can update their own avatar

### Following

- `POST /api/follow/:userId` - Follow a user
  - Headers: `x-user-id: <follower_id>` (required)
  - Returns: `{ success: true, message: 'User followed successfully' }`
  - Note: Cannot follow yourself

- `DELETE /api/follow/:userId` - Unfollow a user
  - Headers: `x-user-id: <follower_id>` (required)
  - Returns: `{ success: true, message: 'User unfollowed successfully' }`

- `GET /api/following` - Get list of users the current user follows
  - Headers: `x-user-id: <user_id>` (required)
  - Returns: `{ success: true, following: [...] }` (array of user IDs)

### File Upload

- `POST /api/upload` - Upload an image file to AWS S3
  - Content-Type: `multipart/form-data`
  - Body: FormData with `image` field
  - Returns: `{ success: true, url: <s3_public_url>, path: <storage_path> }`
  - File size limit: 5MB
  - Allowed types: JPEG, JPG, PNG, GIF, WEBP
  - Images are stored in AWS S3 bucket

### Health & Testing

- `GET /health` - Health check endpoint
  - Returns: `{ status: 'ok', message: 'Backend is running!' }`
  - Use this to verify the backend server is running

- `GET /test-db` - Test PostgreSQL database connection
  - Returns: `{ success: true, database: 'connected', message: '...' }`
  - Use this to verify database connectivity

### Authentication Headers

Most endpoints require the `x-user-id` header to identify the authenticated user:

```
x-user-id: <user_id>
```

This header is automatically added by the frontend API service when a user is logged in.

**Alternative Authentication**: The backend also supports session cookies (`sid`) for authentication. When a user logs in or signs up, a session cookie is set that can be used for subsequent requests. The `GET /api/me` endpoint will check for either the `x-user-id` header or the `sid` cookie.

## Database Schema

The application uses the following PostgreSQL tables:

- **users**: User accounts with username, email, password_hash, and avatar_url
- **posts**: User posts with title, content, type, image_url, video_url, and timestamps
- **likes**: Post likes (user_id, post_id)
- **comments**: Post comments (user_id, post_id, text, timestamps)
- **follows**: User following relationships (follower_id, following_id)

All tables include proper foreign key constraints and cascade delete rules for data integrity.

## Real-time Features (Socket.io)

The application uses Socket.io for real-time updates:

- **New Comments**: Comments appear instantly for all users viewing a post
- **Like Updates**: Like counts update in real-time across all clients
- **New Posts**: New posts from followed users appear in feed immediately

Socket.io rooms:
- `user-{userId}` - User-specific room for receiving updates
- `feed` - General feed updates room
- `post-{postId}` - Post-specific room for comment and like updates

Frontend automatically connects to Socket.io server and joins appropriate rooms based on user activity.

## Troubleshooting

### Common Issues

#### Backend won't start:
- **Check environment variables**: Ensure all required variables are set in `backend/.env`
  - Database credentials: `DB_HOST`, `DB_USER`, `DB_PASSWORD` (or Azure/AWS alternatives)
  - AWS S3: `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - `PORT` (optional, defaults to 3000)
- **Verify database connection**: Check that your PostgreSQL database is running and accessible
- **Verify AWS credentials**: Ensure AWS S3 credentials are correct and have proper permissions
- **Check Node.js version**: Verify Node.js version is 18 or higher: `node --version`
- **Port already in use**: If port 3000 is taken, change `PORT` in `backend/.env` or stop the process using that port

#### Frontend can't connect to backend:
- **Verify backend is running**: Check that backend server is running on port 3000
  - Visit `http://localhost:3000/health` in your browser
- **Check environment variable**: Verify `VITE_API_URL` in root `.env` matches backend URL
  - Should be: `VITE_API_URL=http://localhost:3000`
- **Check CORS configuration**: Backend CORS is configured to allow `http://localhost:5173`
- **Restart frontend**: After changing `.env` file, restart the Vite dev server

#### Image uploads fail:
- **Verify AWS S3 bucket**: Ensure S3 bucket exists and name matches `AWS_S3_BUCKET_NAME` in `.env`
- **Check AWS credentials**: Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct
- **Check AWS permissions**: Ensure IAM user/role has `s3:PutObject` and `s3:DeleteObject` permissions
- **Check file size**: Verify file is under 5MB limit
- **Check file type**: Only JPEG, JPG, PNG, GIF, WEBP are allowed
- **Check bucket policy**: Ensure bucket policy allows public read access if needed
- **Verify AWS region**: Ensure `AWS_REGION` matches your S3 bucket region

#### Database connection errors:
- **Test connection**: Use `GET /test-db` endpoint: `http://localhost:3000/test-db`
- **Verify PostgreSQL is running**: Check that PostgreSQL server is running and accessible
- **Check credentials**: Verify database connection credentials (`DB_HOST`, `DB_USER`, `DB_PASSWORD`)
- **Check network**: Ensure database host is reachable (firewall, security groups, etc.)
- **Check SSL settings**: If using cloud PostgreSQL, verify `DB_SSL` or `AZURE_POSTGRESQL_SSL` is set correctly
- **Check tables**: Ensure database tables are created with correct schema
- **AWS Secrets Manager**: If using `DB_SECRET_ARN`, verify AWS credentials and secret exists
- **Azure PostgreSQL**: If using Azure, verify all `AZURE_POSTGRESQL_*` variables are set correctly

#### Tests fail:
- **Install dependencies**: Run `npm install` to ensure all dependencies are installed
- **Clear and reinstall**: If dependency issues persist:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```
- **Check test environment**: Ensure test setup file exists at `src/test/setup.ts`
- **Verify test files**: Check that test files are in correct location (`src/pages/__tests__/`)

#### Port conflicts:
- **Backend port (3000)**: Change `PORT` in `backend/.env` file
- **Frontend port (5173)**: Vite will automatically use the next available port, or specify with `npm run dev -- --port 5174`

#### TypeScript errors:
- **Check TypeScript version**: Ensure TypeScript is installed and up to date
- **Run type check**: `npx tsc --noEmit` to check for type errors
- **Restart dev server**: Sometimes TypeScript errors clear after restart

## Security Notes

⚠️ **Important**: This project is configured for development purposes. The following security considerations apply:

- **Password Storage**: Passwords are currently stored as plain text (NOT SECURE). In production, use bcrypt or similar hashing libraries.
- **CORS**: Configured to allow localhost origins. Update CORS settings in `backend/src/app.ts` for production deployment.
- **Environment Variables**: Never commit `.env` files. They are already in `.gitignore`.
- **AWS Credentials**: Keep AWS access keys secure. Use IAM roles when deploying to AWS (EC2/Lambda).
- **Database Credentials**: Use AWS Secrets Manager or Azure Key Vault for production database credentials.
- **Authentication**: Currently uses simple header-based authentication. Consider implementing JWT tokens for production.
- **Socket.io**: Real-time features require WebSocket support. Ensure your deployment environment supports WebSockets.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Ensure all tests pass before submitting PRs.

## License

This project is part of a final project for Software Development coursework.
