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
- **Image Uploads**: Upload images to Supabase Storage (5MB limit)
- **Real-time Updates**: Feed automatically refreshes when following relationships change

## Technology Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **React Icons** - Icon library
- **Vitest** - Testing framework

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **Supabase** - PostgreSQL database and storage
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Database & Storage
- **Supabase (PostgreSQL)** - Relational database
- **Supabase Storage** - Image file storage

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/) (free tier is sufficient)

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

4. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Note down your project URL and API keys
   - Set up the required database tables (users, posts, likes, comments, follows)
   - Create a storage bucket named `posts` for image uploads

## Environment Variables

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3000
FRONTEND_URL=http://localhost:5173
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
├── backend/                 # Express API server
│   ├── src/
│   │   ├── app.ts          # Main Express application
│   │   ├── config/
│   │   │   └── database.ts  # Supabase client configuration
│   │   └── services/
│   │       └── uploadService.ts  # Image upload service
│   ├── package.json
│   └── tsconfig.json
├── src/                     # React frontend
│   ├── components/          # Reusable React components
│   │   ├── Dashboard/       # Dashboard component and Navbar
│   │   ├── ProtectedRoute.tsx
│   │   └── SuggestedUsersModal.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   ├── pages/               # Page components
│   │   ├── Login.tsx
│   │   ├── SignUp.tsx
│   │   ├── CreatePost.tsx
│   │   └── Profile.tsx
│   ├── services/
│   │   └── api.ts          # API service layer
│   ├── types/
│   │   └── Post.ts         # TypeScript type definitions
│   ├── App.tsx             # Main App component
│   └── main.tsx            # Application entry point
├── package.json
├── vite.config.ts
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

You should see output like:
```
Server running on http://localhost:3000
Health check: http://localhost:3000/health
```

### Step 2: Start the Frontend Development Server

Open a **new terminal** (keep the backend running) and navigate to the project root:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` (or another available port).

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

You should see the login page. From here, you can:
- Sign up for a new account
- Log in with existing credentials
- Access the dashboard and other features

## Available Scripts

### Frontend Scripts

Run these commands from the project root:

- `npm run dev` - Start the Vite development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Open Vitest UI in the browser
- `npm run test:coverage` - Run tests with coverage report

### Backend Scripts

Run these commands from the `backend/` directory:

- `npm run dev` - Start the development server with hot reload (nodemon)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server (requires build first)

## Project Flows

### Authentication Flow

1. **Sign Up**
   - User navigates to `/signup`
   - Enters username, email, and password
   - Frontend sends POST request to `/api/signup`
   - Backend creates user in Supabase database
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
4. Backend creates post in database and stores image in Supabase Storage
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
   - UI updates immediately to show new like count

3. **Commenting on a Post**
   - User clicks comment button or opens post modal
   - User types comment and submits
   - Frontend sends POST request to `/api/posts/:id/comments`
   - Backend creates comment record
   - Comment appears in the post's comment section

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

### Authentication

- `POST /api/signup` - Create a new user account
  - Body: `{ username, email, password }`
  - Returns: `{ success: true, user: { id, username, email, avatar } }`

- `POST /api/login` - Authenticate user
  - Body: `{ email, password }`
  - Returns: `{ success: true, user: { id, username, email, avatar } }`

- `GET /api/me` - Get current user information
  - Headers: `x-user-id: <user_id>`
  - Returns: `{ success: true, user: { ... } }`

- `POST /api/logout` - Logout user (client-side, clears localStorage)

### Posts

- `GET /api/feed` - Get user's personalized feed
  - Headers: `x-user-id: <user_id>`
  - Returns: `{ success: true, posts: [...] }`

- `GET /api/posts` - Get all posts (optionally filtered by user)
  - Query params: `?user_id=<user_id>` (optional)
  - Returns: `{ success: true, posts: [...] }`

- `POST /api/posts` - Create a new post
  - Headers: `x-user-id: <user_id>`
  - Body: `{ title, content, type, image_url?, video_url?, user_id, username }`
  - Returns: `{ success: true, post: { ... } }`

- `PUT /api/posts/:id` - Update a post
  - Headers: `x-user-id: <user_id>`
  - Body: `{ title, content }`
  - Returns: `{ success: true, post: { ... } }`

- `DELETE /api/posts/:id` - Delete a post
  - Headers: `x-user-id: <user_id>`
  - Returns: `{ success: true, message: 'Post deleted successfully' }`

### Interactions

- `POST /api/posts/:id/like` - Like a post
  - Headers: `x-user-id: <user_id>`
  - Returns: `{ success: true, message: 'Post liked' }`

- `DELETE /api/posts/:id/like` - Unlike a post
  - Headers: `x-user-id: <user_id>`
  - Returns: `{ success: true, message: 'Post unliked' }`

- `GET /api/posts/:id/comments` - Get comments for a post
  - Returns: `{ success: true, comments: [...] }`

- `POST /api/posts/:id/comments` - Add a comment to a post
  - Headers: `x-user-id: <user_id>`
  - Body: `{ text }`
  - Returns: `{ success: true, comment: { ... } }`

### Users

- `GET /api/users/:id` - Get user profile
  - Headers: `x-user-id: <current_user_id>` (optional)
  - Returns: `{ success: true, user: { id, username, email, avatar_url, followerCount, followingCount, isFollowing } }`

- `GET /api/users/search/:query` - Search users by username
  - Headers: `x-user-id: <user_id>` (optional)
  - Returns: `{ success: true, users: [...] }`

- `GET /api/users/suggested` - Get suggested users to follow
  - Headers: `x-user-id: <user_id>`
  - Returns: `{ success: true, users: [...] }`

- `GET /api/users/:id/followers` - Get user's followers
  - Returns: `{ success: true, followers: [...] }`

- `GET /api/users/:id/following` - Get users that a user follows
  - Returns: `{ success: true, following: [...] }`

- `PUT /api/users/:id/avatar` - Update user avatar
  - Headers: `x-user-id: <user_id>`
  - Body: `{ avatar_url }`
  - Returns: `{ success: true, user: { ... } }`

### Following

- `POST /api/follow/:userId` - Follow a user
  - Headers: `x-user-id: <follower_id>`
  - Returns: `{ success: true, message: 'User followed successfully' }`

- `DELETE /api/follow/:userId` - Unfollow a user
  - Headers: `x-user-id: <follower_id>`
  - Returns: `{ success: true, message: 'User unfollowed successfully' }`

- `GET /api/following` - Get list of users the current user follows
  - Headers: `x-user-id: <user_id>`
  - Returns: `{ success: true, following: [...] }`

### File Upload

- `POST /api/upload` - Upload an image file
  - Content-Type: `multipart/form-data`
  - Body: FormData with `image` field
  - Returns: `{ success: true, url: <public_url>, path: <storage_path> }`
  - File size limit: 5MB

### Health & Testing

- `GET /health` - Health check endpoint
  - Returns: `{ status: 'ok', message: 'Backend is running!' }`

- `GET /test-db` - Test Supabase database connection
  - Returns: `{ success: true, database: 'connected', message: '...' }`

### Authentication Headers

Most endpoints require the `x-user-id` header to identify the authenticated user:

```
x-user-id: <user_id>
```

This header is automatically added by the frontend API service when a user is logged in.

