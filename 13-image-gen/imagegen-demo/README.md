# Frontiers

A Next.js application for generating and post-processing images using the OpenAI API. This was used as a Demo Booth for SF Frontiers 2025. 

<img width="736" alt="Screenshot 2025-05-15 at 7 58 48 AM" src="https://github.com/user-attachments/assets/7df70f06-fcf1-418a-9ac7-2b4f1125e0fd" />


## Features

- AI-powered image generation with custom style modifiers.
- Post-process images by overlaying an SVG border using Sharp.
- Interactive UI for uploading images and downloading results.

- You can find the prompts and sample images here: https://docs.google.com/document/d/19tiXUb0VtOWBabxvanXXxk2js1Ha3aYtMGJpzcDLBFY/edit?tab=t.0

## Prerequisites

- Node.js v18 or higher (https://nodejs.org)
- npm, Yarn, pnpm, or Bun
- OpenAI API key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-org>/frontiers.git
   cd frontiers
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```
3. Create a `.env.local` file in the project root with your OpenAI API key:
   ```bash
   echo "OPENAI_API_KEY=your_openai_api_key" > .env.local
   ```

## Running Locally

### Development

Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The app will reload on file changes.

### Production

Build and start the production server:
```bash
npm run build
npm run start
```
The production server listens on port 3000 by default.

## Usage

1. Upload an image and select one or more style modifiers.
2. Click **Generate Images** to create styled images via `/api/generate`.
3. Click **Download Image with Border** to post-process the original image with an SVG border via `/api/process`.

### SVG Border Configuration

By default, the server expects an SVG border file at `public/OpenAI_Frontiers-2025.svg`. Replace this file with your own SVG (using the same filename), or update the path in `src/app/api/process/route.ts`.

## API Reference

### POST /api/generate

- Content-Type: `multipart/form-data`
- Parameters:
  - `image`: Image file to process.
  - `modifiers[]`: List of style modifier keys.
- Response: JSON with generated image data URLs.

### POST /api/stream

- Content-Type: `multipart/form-data`
- Parameters:
  - `image`: Image file to process.
  - `modifier`: Single style modifier key.
- Response: newline-delimited JSON events with `partial` and `final` image URLs.

### POST /api/process

- Content-Type: `application/json`
- Body:
  ```json
  {
    "imageData": "data:image/png;base64,..."
  }
  ```
- Response: JSON with processed image data URL including the SVG border.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

- Next.js Documentation: https://nextjs.org/docs
- OpenAI Platform Docs: https://platform.openai.com/docs
- Tailwind CSS Docs: https://tailwindcss.com/docs

## Deployment

Deploy easily on Vercel:
```bash
vercel
```
See [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
