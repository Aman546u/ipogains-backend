# IPOGains Backend API

This is the Node.js/Express backend API for the IPOGains platform. It handles database connections, authentication, IPO data management, and notifications.

## 🚀 How to Run Locally

1.  Navigate to this folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up Environment Variables:
    -   Copy `.env.example` to `.env`.
    -   Fill in your MongoDB URI and Email credentials.
4.  Start the server:
    ```bash
    npm start
    ```
    The server runs on `http://localhost:3000`.

## 🛠️ Tech Stack
-   **Node.js & Express**: API Server
-   **MongoDB & Mongoose**: Database
-   **JWT**: Authentication
-   **Nodemailer**: Email sending
-   **Canva Confetti**: (Wait, that's frontend, maybe a remnant in backend package.json?)

## 🔗 Connection to Frontend

This backend accepts requests from the frontend defined in `.env` as `FRONTEND_URL`.
-   **Development**: `http://localhost:5500`
-   **Production**: Update `FRONTEND_URL` in `.env` to your Production deployment URL (e.g., Netlify/Vercel URL).

## 📦 Deployment
You can deploy this folder to:
-   Render (Web Service)
-   Railway
-   Heroku
-   AWS Elastic Beanstalk
