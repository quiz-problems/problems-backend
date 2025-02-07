# CS Quiz Application Backend

A Node.js/Express backend server for the CS Quiz application with MongoDB database.

## Features

- RESTful API architecture
- JWT-based authentication
- Role-based access control
- Quiz management system
- User progress tracking
- Leaderboard system
- Achievement system
- PDF generation
- Comprehensive error handling

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- PDFKit for PDF generation
- Express Validator for input validation

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- MongoDB installed and running
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cs_quiz_app
JWT_SECRET=your-secret-key
```

4. Start the server:
```bash
npm run dev
```

The server will be running at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user

### Quizzes
- `GET /api/v1/quizzes` - Get all quizzes
- `GET /api/v1/quizzes/:id` - Get quiz by ID
- `POST /api/v1/quizzes/:id/submit` - Submit quiz answers

### Admin
- `GET /api/v1/admin/dashboard` - Get admin dashboard stats
- `POST /api/v1/admin/quizzes` - Create new quiz
- `PUT /api/v1/admin/quizzes/:id` - Update quiz
- `DELETE /api/v1/admin/quizzes/:id` - Delete quiz

### Topics
- `GET /api/v1/topics` - Get all topics
- `GET /api/v1/topics/:id` - Get topic by ID
- `POST /api/v1/topics` - Create new topic (admin)
- `PUT /api/v1/topics/:id` - Update topic (admin)

### Leaderboard
- `GET /api/v1/leaderboard/global` - Get global leaderboard
- `GET /api/v1/leaderboard/topic/:id` - Get topic leaderboard
- `GET /api/v1/leaderboard/quiz/:id` - Get quiz leaderboard
- `GET /api/v1/leaderboard/weekly` - Get weekly leaderboard

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic
└── app.js           # Application entry point
```

## Data Models

### User
- Basic info (name, email)
- Authentication details
- Role-based access
- Achievement tracking

### Quiz
- Questions and answers
- Difficulty levels
- Time limits
- Topics association

### Result
- Quiz attempts
- User scores
- Time tracking
- Answer history

## Error Handling

The application implements comprehensive error handling:
- Validation errors
- Authentication errors
- Database errors
- Custom error responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request