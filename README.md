# Shezz Traders — E-Commerce Store

A full-stack e-commerce store for **Shezz Traders**, a Pakistan-based GPS tracking and vehicle security company. Built with React + Vite + MUI on the frontend and Node.js + Express + MongoDB on the backend.

---

## 📖 Overview

The project includes:

- **Public storefront** — hero landing page, product catalog, product details, cart, guest checkout, contact form, and legal pages
- **Hidden admin panel** — accessible only via `/admin` (not linked from the site), where the store owner manages products, categories, orders, and views real-time stats
- **Backend API** — RESTful Express server with JWT authentication, image uploads, MongoDB persistence, and email notifications
- **Transactional email** — automated order confirmation to the customer and admin notification to the store owner via Nodemailer
- **Payment methods** — Cash on Delivery, JazzCash, EasyPaisa, and Bank Transfer (with WhatsApp screenshot verification flow)

---

## 🏗️ Tech Stack

### Frontend
| Package | Purpose |
|---|---|
| React 18 | UI library |
| Vite | Build tool / dev server |
| MUI (Material-UI v7) | Component library |
| React Router v7 | Client-side routing |
| Emotion | MUI's CSS-in-JS engine |

### Backend
| Package | Purpose |
|---|---|
| Node.js | Runtime |
| Express | HTTP server |
| MongoDB + Mongoose | Database & ODM |
| JSON Web Token | Admin authentication |
| bcryptjs | Password hashing |
| Multer | File uploads |
| Nodemailer | Email sending |
| CORS | Cross-origin handling |
| dotenv | Environment variable management |
| Nodemon (dev) | Auto-restart on file change |

### External Services
| Service | Purpose |
|---|---|
| MongoDB Atlas | Cloud database |
| Gmail SMTP | Outgoing email |
| WhatsApp (`wa.me`) | Order notifications & customer contact |

---

## 📁 Project Structure
