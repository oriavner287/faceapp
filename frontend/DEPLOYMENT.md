# Deployment Guide

## Vercel Deployment

### Required Environment Variables

Set these environment variables in your Vercel dashboard:

1. **NEXT_PUBLIC_BACKEND_URL** (Required)

   - Your backend API URL
   - Example: `https://your-backend-domain.com`

2. **SESSION_SECRET** (Required for production)

   - A secure random string for session encryption
   - Generate with: `openssl rand -base64 32`

3. **ENCRYPTION_KEY** (Required for production)
   - A secure random string for data encryption
   - Generate with: `openssl rand -base64 32`

### Optional Environment Variables

4. **MAX_FILE_SIZE** (Optional)

   - Maximum file upload size in bytes
   - Default: `10485760` (10MB)

5. **ALLOWED_MIME_TYPES** (Optional)

   - Comma-separated list of allowed MIME types
   - Default: `image/jpeg,image/png,image/webp`

6. **RATE_LIMIT_WINDOW_MS** (Optional)

   - Rate limiting window in milliseconds
   - Default: `900000` (15 minutes)

7. **RATE_LIMIT_MAX_REQUESTS** (Optional)
   - Maximum requests per window
   - Default: `100`

### Deployment Steps

1. Connect your repository to Vercel
2. Set the environment variables in Vercel dashboard
3. Deploy the application

### Security Notes

- Never commit secrets to version control
- Use strong, randomly generated secrets for production
- Regularly rotate secrets
- Monitor for security warnings in logs

## Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in the required environment variables
3. Run `npm run dev`

## Build Issues

If you encounter build issues:

1. Check that all required environment variables are set
2. Ensure TypeScript compilation passes: `npm run type-check`
3. Verify ESLint passes: `npm run lint`
4. Check Next.js configuration is valid
