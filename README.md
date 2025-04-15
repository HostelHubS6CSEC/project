# Hostel Management System

Welcome to the Hostel Management System, a web application designed to streamline hostel administration tasks. This project includes features for admins, wardens, and students, with functionalities such as room allotment, gate pass management, attendance tracking, and notice posting. Built with React, integrated with Supabase for backend services, and deployed on Google Cloud Platform.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Deployment](#deployment)

## Features
- **Admin Dashboard**: Manage students, add wardens/security staff, post notices, and delete users with associated data.
- **Warden Dashboard**: Approve/reject gate passes, process discontinuations, and mark attendance.
- **Student Dashboard**: Request gate passes, view notices, and manage profile details.
- **Real-time Updates**: Powered by Supabase for synchronized data across users.
- **Secure Authentication**: Password hashing with bcrypt and role-based access control.

## Tech Stack
- **Frontend**: React, Tailwind CSS, jsPDF
- **Backend/Data**: Supabase (Authentication, Realtime, Storage)
- **Storage**: Supabase Bucket
- **Deployment**: Netlify
- **Dependencies**: Node.js, npm

## Installation

### Prerequisites
- Node.js (v18 or later)
- npm
- Supabase CLI (optional for local development)
- Git

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/HostelHubS6CSEC/project.git
   cd project
2. Install dependencies:
   ```bash
   npm install
3. Change the .env file contents to include your supabase url and anon key
4. Run the server
   ```bash
   npm run dev
5. Visit https://localhost:5173/


## Deployment 
   can be found at https://hostelhub-mini.netlify.app/
