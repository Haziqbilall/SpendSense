# SpendSense

**Smart Personal Finance Management System**

## Overview

SpendSense is a comprehensive full-stack personal finance management application designed to help users track expenses, manage budgets, split bills, and achieve savings goals. With AI-powered insights and real-time collaboration features, SpendSense transforms the way you manage your finances.

Built using **React.js with Vite** for the frontend, **NestJS** for the backend, and featuring real-time communication via **WebSockets**, the system provides a modern, responsive, and intelligent approach to personal finance.

🌐 **Live Demo**: [https://spend-sense-nu-five.vercel.app](https://spend-sense-nu-five.vercel.app)

## Key Features

### Expense Tracking

- Log and categorize daily expenses with ease
- View expense history with detailed breakdowns
- Filter and search expenses by category, date, and amount
- Export expense reports to PDF

### Budget Management

- Create and manage monthly/weekly budgets
- Set spending limits per category
- Real-time budget tracking with visual progress indicators
- Receive alerts when approaching budget limits

### Savings Goals

- Set personalized savings targets with deadlines
- Track progress toward financial goals
- Visual goal completion tracking
- Milestone celebrations and notifications

### Bill Splitting

- Split bills among multiple participants
- Support for various split strategies (equal, percentage, custom)
- Track who owes what with automatic calculations
- Send reminders to participants

### AI-Powered Insights

- Intelligent spending analysis and recommendations
- Personalized financial advice based on spending patterns
- Predictive budget suggestions
- Smart categorization of expenses

### AI Agent

- Interactive conversational AI assistant powered by **Grok**
- **In-memory RAG** (Retrieval-Augmented Generation) for contextual responses
- **Create budgets** - "Create a $500 monthly food budget"
- **Log expenses** - "I spent $30 on lunch"
- **Set savings goals** - "Save $5000 for vacation by December"
- **Send messages** - "Tell John I'll pay him tomorrow"
- **Answer questions** - "How do I manage my finances better?"
- Natural language processing for all financial operations
- Context-aware responses based on your financial data

### Social & Collaboration

- Connect with friends and family for shared expenses
- Real-time chat functionality for financial discussions
- Send and receive connection invitations
- Collaborative budget planning

### Smart Notifications

- Real-time alerts for budget limits and bill reminders
- Expense tracking notifications
- Goal milestone achievements
- Connection and invitation updates

### Reports & Analytics

- Comprehensive financial reports
- Visual charts and graphs for spending patterns
- Category-wise expense breakdown
- Exportable PDF reports

## Tech Stack

### Frontend

- **React.js** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Socket.IO Client** for real-time features

### Backend

- **NestJS** (Node.js framework)
- **TypeScript** for type safety
- **Socket.IO** for real-time communication
- **Grok AI** for intelligent agent capabilities
- **In-memory RAG** for context-aware AI responses
- **JWT Authentication** for secure access

## Project Structure

```
SpendSense/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Application pages
│   │   ├── services/   # API and socket services
│   │   ├── stores/     # State management
│   │   ├── hooks/      # Custom React hooks
│   │   └── utils/      # Utility functions
│   └── ...
│
├── backend/            # NestJS backend application
│   ├── src/
│   │   ├── modules/    # Feature modules
│   │   │   ├── auth/           # Authentication
│   │   │   ├── users/          # User management
│   │   │   ├── expenses/       # Expense tracking
│   │   │   ├── budgets/        # Budget management
│   │   │   ├── bills/          # Bill splitting
│   │   │   ├── savings_goals/  # Savings goals
│   │   │   ├── ai/             # AI insights
│   │   │   ├── chat/           # Real-time chat
│   │   │   ├── notifications/  # Notifications
│   │   │   └── ...
│   │   └── common/     # Shared utilities and services
│   └── ...
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **bun** package manager
- Database setup (as per backend configuration)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd SpendSense
   ```

2. **Setup Backend**

   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

3. **Setup Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`

## Environment Variables

### Frontend (.env)

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=your_backend_api_url
VITE_API_WS_URL=your_backend_websocket_url
```

### Backend (.env)

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=your_frontend_url

# Make AI responses plain text (removes markdown like **bold**)
AI_PLAIN_TEXT=true

# Render keep-alive (prevents cold starts / sleeping)
# Set SELF_URL to your Render backend URL + /api/health (NOT localhost) in production.
KEEPALIVE_ENABLED=true
KEEPALIVE_INTERVAL_SECONDS=300
SELF_URL=http://localhost:3000/api/health

# Render DB keep-alive (touch Postgres daily so it doesn't sleep)
DB_KEEPALIVE_ENABLED=true
# Default: 3:00 AM server time
DB_KEEPALIVE_CRON=0 3 * * *
```

Tip: you can copy `backend/.env.example` to `backend/.env` and fill in real values.

## Core Modules

| Module             | Description                                              |
| ------------------ | -------------------------------------------------------- |
| **Authentication** | Secure login, registration, and password management      |
| **Expenses**       | Track, categorize, and analyze spending                  |
| **Budgets**        | Set and monitor spending limits                          |
| **Bills**          | Split and manage shared expenses                         |
| **Savings Goals**  | Set and track financial targets                          |
| **AI Insights**    | Get intelligent financial recommendations                |
| **AI Agent**       | Interactive AI assistant for financial queries and tasks |
| **Connections**    | Connect with friends for shared finances                 |
| **Chat**           | Real-time messaging for financial discussions            |
| **Notifications**  | Stay updated with smart alerts                           |
| **Reports**        | Generate comprehensive financial reports                 |

## Security Features

- JWT-based authentication
- Secure password hashing
- Protected API endpoints
- Input validation and sanitization

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is developed for educational purposes.
