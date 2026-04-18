# Responsive Invoice App

A simple invoice builder made with React and Vite. The app lets you fill out invoice details, add or remove line items, calculate totals automatically, print the invoice, and keep data saved in the browser with `localStorage`.

## Features

- Create and edit invoice details
- Add, update, and remove invoice items
- Automatic total calculation
- Print-friendly layout for PDF export
- Copy a short invoice summary to the clipboard
- Local persistence with browser storage
- Responsive layout for desktop and mobile

## Tech Stack

- React
- Vite
- Lucide React
- Tailwind utility classes via CDN

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Installation

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Then open the local URL shown in the terminal.

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the app for production.

```bash
npm run preview
```

Previews the production build locally.

## Project Structure

```text
.
├── App.jsx
├── index.html
├── main.jsx
├── styles.css
├── package.json
└── vite.config.js
```

## How It Works

- Invoice data is managed in React state
- Changes are saved automatically in `localStorage`
- Line totals and the final total are calculated in the app
- The print action uses the browser print dialog for printing or saving as PDF

## Notes

- This project currently uses Tailwind classes through the CDN script in `index.html`
- No backend or database is required

## License

This project is open for personal and educational use.
