# Heartbeat - Anonymous Pulse Surveys

A tool for anonymously monitoring team well-being through quick pulse surveys.

## Supabase Integration

This application uses Supabase to store pulse surveys, responses, and AI analyses. Here's how to set it up:

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Note your project URL and anon key (from Project Settings > API)

### 2. Set Up the Database Schema

1. In the Supabase dashboard, go to the SQL Editor
2. Create a new query
3. Copy the contents from `supabase/schema.sql` in this repository
4. Run the query to set up the tables and security policies

For detailed instructions, see the `supabase/setup.md` file.

### 3. Configure Environment Variables

Update your `.env` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Verify Setup

Run the verification script to check that Supabase is set up correctly:

```bash
npm run test:supabase
```

This will:
- Check if all required tables exist
- Verify the default user exists
- Create a test pulse and response
- Verify that data can be retrieved

### 5. Run the Application

```bash
npm run dev
```

## User Support

The application supports multiple users with the following structure:

1. Each pulse is associated with a user (currently defaulting to user ID 1)
2. A default user is created during setup with ID 1
3. The schema is designed to allow for future multi-user support

## Tables

The Supabase setup includes four main tables:

1. **heartbeat_users** - For storing user information
   - id: Unique identifier (SERIAL)
   - email: User's email address
   - name: User's name
   - created_at: When the user was created

2. **pulses** - Stores the pulse surveys
   - id: Unique identifier (TEXT)
   - user_id: References the user who created the pulse
   - created_at: Creation timestamp
   - emails: JSON array of email addresses
   - response_count: Number of responses
   - last_checked: Last time the pulse was checked
   - has_analysis: Whether AI analysis is available

3. **responses** - Stores anonymous responses
   - id: Unique identifier (UUID)
   - pulse_id: References the pulse
   - response: Text content of the response
   - timestamp: When the response was submitted
   - respondent_id: Anonymous identifier for response tracking

4. **analyses** - Stores AI analyses
   - id: Unique identifier (UUID)
   - pulse_id: References the pulse
   - content: HTML content of the analysis
   - created_at: When the analysis was first created
   - updated_at: When the analysis was last updated

## Email Setup with Resend

This application uses [Resend](https://resend.com) for sending emails. There are two ways to set up email:

### Option 1: Using Mock Email Mode (for development)

By default, the application will use a mock email mode that logs emails to the console instead of sending real emails. This is useful for development and testing.

Simply run the application without setting up a Resend API key, and it will automatically use mock mode.

### Option 2: Using Real Email Sending (with Resend)

To send real emails:

1. Create an account at [resend.com](https://resend.com)
2. Get your API key from the Resend dashboard
3. Add the API key to your `.env.local` file:
   ```
   RESEND_API_KEY=re_YOUR_API_KEY_HERE
   ```
4. For production, add a verified domain in your Resend dashboard
5. Update the `from` email address in `src/app/lib/email.ts` to use your verified domain

## Features

- **Create Pulse Checks**: Send anonymous surveys to team members via email
- **Simple Response Form**: Team members can quickly share how they're feeling
- **AI-Powered Analysis**: Claude analyzes responses to identify trends and concerns
- **Anonymous Insights**: Get a summary of team sentiment without identifying individuals
- **Action Items**: Receive suggestions for addressing team concerns
- **Persistent Storage**: All data is stored in Supabase with localStorage fallback

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **AI Integration**: Claude API for response analysis
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend API
- **Styling**: Custom heartbeat animations and sleek dark theme

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
RESEND_API_KEY=re_YOUR_API_KEY_HERE
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CLAUDE_API_KEY=your_claude_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For production, update the `NEXT_PUBLIC_BASE_URL` to your actual domain.

## Deploying to Vercel

This project is configured for easy deployment on Vercel.

### Manual Deployment

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com) and create a new project
3. Import your GitHub repository
4. Configure the environment variables mentioned above in the Vercel project settings
5. Deploy!

### Automated Deployment with GitHub Actions

This project includes a GitHub workflow for automated deployment to Vercel:

1. Go to your GitHub repository settings > Secrets and variables > Actions
2. Add the following secrets:
   - `VERCEL_TOKEN`: Your Vercel API token (from Vercel account settings)
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID
3. Push to the main branch to trigger automatic deployment

### Vercel Environment Variables

Make sure to add all the environment variables from your `.env` file to your Vercel project settings. 
Vercel will automatically handle the `NEXT_PUBLIC_BASE_URL` variable in production.

## License

MIT
