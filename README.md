# 🚚 FleetPro: Enterprise Fleet Management Intelligence

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

**FleetPro** is a state-of-the-art, AI-powered fleet management and logistics platform. Designed for modern enterprises, it streamlines entire fleet operations—from real-time GPS tracking and route optimization to predictive maintenance and comprehensive driver analytics.

---

## ✨ What Makes FleetPro Beautiful?

FleetPro isn't just a tool; it's a **premium experience**.
- **Modern Aesthetics**: Built with a sleek, minimalist design language using tailwind 4.0, glassmorphism, and a curated color palette.
- **Smooth Micro-animations**: Integrated `framer-motion` for fluid transitions that make the data feel alive.
- **Intelligent Fallbacks**: A robust "Triple-Layer" AI system that ensures the platform remains operational even during API outages.
- **Role-Tailored UX**: Every user—from the Admin to the Driver—gets a unique, purpose-built interface designed for their specific needs.

---

## 🛠️ Tech Stack

### Frontend (User Experience)
- **Framework**: [React 18](https://reactjs.org/) & [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts/Data Viz**: [Recharts](https://recharts.org/)
- **Maps/GPS**: [Leaflet](https://leafletjs.com/) (OpenStreetMap)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State/Routing**: [React Router 7](https://reactrouter.com/)

### Backend (Infrastructure)
- **Runtime**: [Node.js](https://nodejs.org/) (Express 5.2)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose 9.1](https://mongoosejs.com/)
- **Real-time**: [Socket.io](https://socket.io/)
- **Security**: [JWT](https://jwt.io/), [Bcrypt](https://github.com/kelektiv/node.bcrypt.js), [Helmet](https://helmetjs.github.io/)
- **Auth**: [Passport.js](https://www.passportjs.org/) (Google OAuth 2.0)

### AI Intelligence
- **OpenAI GPT-4**: Powers the interactive **AI Assistant** and the **Route Optimization Engine**, providing predictive insights and natural language fleet queries.

---

## 🚀 Key Features

*   **🏆 Multi-Role Dashboards**: Specific workflows for **Admin**, **Manager**, **Driver**, and **Customer**.
*   **📍 Real-Time GPS Tracking**: High-precision vehicle tracking with animated movement and historical trails.
*   **🤖 FleetPro AI Assistant**: An embedded chat expert that understands your fleet's data and provides instant recommendations.
*   **🛣️ AI Route Optimization**: Calculate the most fuel-efficient paths using live traffic and asset data.
*   **🔧 Predictive Maintenance**: Automated reminders and cost-tracking to prevent breakdowns before they happen.
*   **📂 Document Management**: Secure handling of vehicle registrations, insurance, and driver licenses.
*   **📊 Insightful Analytics**: Dynamic charts for mileage, fuel costs, utilization, and safety scores.

---

## 🏗️ Architecture: How it Works

1.  **Data Ingestion**: Vehicles and devices report telemetry (GPS, status) to the Express backend via REST and WebSockets.
2.  **AI Processing**: The system feeds fleet context into OpenAI GPT-4 to generate optimization strategies and maintenance alerts.
3.  **Real-Time Sync**: Changes in vehicle status or new assignments are pushed instantly to the frontend using Socket.io.
4.  **Role Access**: Passport.js and JWT ensure that users only see the data relevant to their authorized role.

---

## 💼 Use Cases & Applications

*   **Logistics & Delivery**: Companies managing large van or truck fleets for urban delivery.
*   **Corporate Fleets**: Businesses tracking executive transport and pool cars.
*   **Public Transport**: Optimizing routes and maintenance for bus and shuttle services.
*   **Rental Agencies**: Managing asset health and tracking high-value rental inventory.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or via Atlas)
- OpenAI API Key


## 🎨 Tools Used
- **Visual Studio Code**: Primary IDE.
- **Postman/Insomnia**: API Testing.
- **MongoDB Compass**: Database visualization.
- **Lucide**: Iconography system.

---

Designed with ❤️ by **FleetPro Dev Team**
