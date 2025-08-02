# LavenderDragonDesign's Grid Mockup Generator

An advanced tool to create stunning visual mockups by arranging images in various grid layouts. Customize spacing, zoom, text overlays, and export your creations as high-quality PNGs.

This project was built with Vite and React.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```sh
   cd <project-directory>
   ```
3. Install the dependencies:
   ```sh
   npm install
   ```

### Running the App

To start the development server, run:
```sh
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal) to view it in your browser. The page will reload when you make changes.

## Deployment

### Building for Production

To create an optimized production build, run:
```sh
npm run build
```
This command bundles the app into the `dist/` directory.

### Netlify

This project is ready for deployment on Netlify. Simply connect your GitHub repository to a new Netlify site. The included `netlify.toml` file will automatically configure the build settings:

- **Build command:** `npm run build`
- **Publish directory:** `dist`