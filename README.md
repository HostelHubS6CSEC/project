# Hostel Management System

Welcome to the Hostel Management System, a web application designed to streamline hostel administration tasks. This project includes features for admins, wardens, and students, with functionalities such as room allotment, gate pass management, attendance tracking, and notice posting. Built with React, integrated with Supabase for backend services, and deployed on Google Cloud Platform.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features
- **Admin Dashboard**: Manage students, add wardens/security staff, post notices, and delete users with associated data.
- **Warden Dashboard**: Approve/reject gate passes, process discontinuations, and mark attendance.
- **Student Dashboard**: Request gate passes, view notices, and manage profile details.
- **Real-time Updates**: Powered by Supabase for synchronized data across users.
- **Secure Authentication**: Password hashing with bcrypt and role-based access control.

## Tech Stack
- **Frontend**: React, Tailwind CSS, jsPDF
- **Backend/Data**: Supabase (Authentication, Realtime, Storage)
- **Storage**: Amazon S3 for profile pictures
- **Deployment**: Google Cloud App Engine
- **Dependencies**: Node.js, npm, Google Cloud SDK

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
