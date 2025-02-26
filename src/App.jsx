import React from 'react';
import SafeTensorsVisualizer from './components/SafeTensorsVisualizer';
import './index.css';
import './safetensors-design.css'; // Import the new CSS file

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
        <div className="container mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold">SafeTensors Visualizer</h1>
          <p className="mt-2 opacity-80">
            Explore and visualize neural networks from SafeTensors files
          </p>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4">
        <SafeTensorsVisualizer />
      </main>
      
      <footer className="bg-gray-800 text-gray-300 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            SafeTensors Visualizer runs entirely in your browser. No data is sent to any server.
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <a href="https://github.com/taipinc/safetensors-visualizer" 
               className="text-gray-300 hover:text-white transition-colors"
               target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://huggingface.co/docs/safetensors/index" 
               className="text-gray-300 hover:text-white transition-colors"
               target="_blank" rel="noopener noreferrer">
              SafeTensors Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;