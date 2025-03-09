# ER Diagram Generator

A modern web application for creating Entity-Relationship diagrams from SQL statements. Built with React, TypeScript, and Vite.

## Features

- Convert SQL CREATE TABLE statements into ER diagrams
- Interactive diagram canvas for visualizing entity relationships
- Drag, resize and customize entities
- Export diagrams as PNG, JPEG, SVG, or JSON
- Share diagrams via URL
- Import diagrams from JSON files

## Project Structure

```txt
src/
├── components/
│   ├── DiagramCanvas.tsx  # Canvas for displaying and manipulating entities
│   ├── Entity.tsx         # Entity component with properties and fields
│   ├── Relationship.tsx   # Visualizes relationships between entities
│   └── SqlInputPanel.tsx  # Panel for SQL input and processing
├── App.css                # Main application styles
├── App.tsx                # Main application component
├── index.html             # HTML entry point
├── main.tsx               # React entry point
└── vite-env.d.ts          # TypeScript environment declaration
```

## Technologies Used

- React 19
- TypeScript
- Vite 6
- HTML5 Canvas
- Font Awesome
- html2canvas (for PNG/JPEG export)
- dom-to-svg (for SVG export)

## Development

### Getting Started

1. Clone the repository
2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```

   or with network access:

   ```sh
   npm start
   ```

### Available Scripts

- `npm start` - Start development server with network access
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Building for Production

Run `npm run build` to create a production-ready build in the `dist` directory.

## License

[GNU GPLv3](LICENSE)
