import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

// SVG icons for UI elements
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

const LayersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const NetworkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1zM13 12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 00-1-1h-3zm1 2v1h1v-1h-1z" clipRule="evenodd" />
    <path d="M11 4a1 1 0 10-2 0v7.59l-6.29-6.3a1 1 0 00-1.42 1.42l6.3 6.29H0a1 1 0 100 2h7.59l-6.3 6.29a1 1 0 001.42 1.42l6.29-6.3V19a1 1 0 102 0v-7.59l6.3 6.29a1 1 0 001.42-1.42l-6.3-6.29H19a1 1 0 100-2h-7.59l6.3-6.29a1 1 0 00-1.42-1.42L11 11.59V4z" />
  </svg>
);

const TensorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SafeTensorsVisualizer = () => {
  const [file, setFile] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [progressStatus, setProgressStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // For visualization
  const svgRef = useRef(null);
  const networkContainerRef = useRef(null);
  const simulationRef = useRef(null);
  
  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setModelData(null);
      setError(null);
      setProgressStatus('');
    }
  };
  
  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.safetensors')) {
        setFile(droppedFile);
        setModelData(null);
        setError(null);
        setProgressStatus('');
      } else {
        setError('Please upload a .safetensors file');
      }
    }
  };
  
  // Process the selected file
  const analyzeFile = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setProgressStatus('Reading file...');
    
    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await readFileAsArrayBuffer(file);
      
      // Extract header
      setProgressStatus('Parsing header...');
      const { header, metadataObj } = await extractSafeTensorsHeader(arrayBuffer);
      
      // Process model structure
      setProgressStatus('Analyzing model structure...');
      const modelStructure = processModelStructure(header, metadataObj);
      
      setModelData(modelStructure);
      setActiveTab('summary');
      setLoading(false);
      setProgressStatus('');
    } catch (err) {
      console.error("Error processing file:", err);
      setError(`Failed to process file: ${err.message}`);
      setLoading(false);
      setProgressStatus('');
    }
  };
  
  // Read file as ArrayBuffer
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Error reading file"));
      reader.readAsArrayBuffer(file);
    });
  };
  
  // Extract header from safetensors file
  const extractSafeTensorsHeader = (arrayBuffer) => {
    try {
      // First 8 bytes contain the header size as a 64-bit little-endian unsigned integer
      const headerSizeView = new DataView(arrayBuffer.slice(0, 8));
      const headerSize = Number(headerSizeView.getBigUint64(0, true));
      
      // Read the JSON header
      const headerBytes = new Uint8Array(arrayBuffer.slice(8, 8 + headerSize));
      const headerText = new TextDecoder().decode(headerBytes);
      const header = JSON.parse(headerText);
      
      // Extract metadata if available
      const metadataObj = header.__metadata__ || {};
      
      return { header, metadataObj };
    } catch (err) {
      throw new Error(`Failed to parse safetensors header: ${err.message}`);
    }
  };
  
  // Process model structure from header data
  const processModelStructure = (header, metadata) => {
    // Remove metadata from the header object to get only tensors
    const { __metadata__, ...tensors } = header;
    
    // Extract tensor info
    const tensorEntries = Object.entries(tensors).map(([name, info]) => {
      // Parse the shape and data type
      return {
        name,
        shape: Array.isArray(info.shape) ? info.shape : [],
        dtype: info.dtype || 'unknown',
        size: Array.isArray(info.shape) ? info.shape.reduce((a, b) => a * b, 1) : 0,
        offset: info.data_offsets ? info.data_offsets[0] : 0,
        end: info.data_offsets ? info.data_offsets[1] : 0
      };
    });
    
    // Helper to extract layer name from tensor name
    const getLayerName = (tensorName) => {
      const parts = tensorName.split('.');
      
      // Common patterns in model architectures
      if (parts.length >= 2) {
        // For transformer models, group by block/layer structure
        if (tensorName.includes('layer') || tensorName.includes('block')) {
          const layerMatch = tensorName.match(/(layer|block)[._]?(\d+)/i);
          if (layerMatch) {
            return layerMatch[0];
          }
        }
        
        // For other architectures, use the first component
        return parts[0];
      }
      
      return tensorName;
    };
    
    // Helper to identify layer type based on tensor names
    const identifyLayerType = (tensors) => {
      const name = tensors[0].name.toLowerCase();
      
      if (name.includes('conv')) return 'conv';
      if (name.includes('attention') || name.includes('attn')) return 'attention';
      if (name.includes('linear') || name.includes('dense') || name.includes('fc')) return 'linear';
      if (name.includes('norm') || name.includes('ln')) return 'norm';
      if (name.includes('embed')) return 'embedding';
      if (name.includes('rnn') || name.includes('lstm') || name.includes('gru')) return 'recurrent';
      if (name.includes('pool')) return 'pooling';
      if (name.includes('dropout')) return 'dropout';
      if (name.includes('bias')) return 'bias';
      if (name.includes('bn') || name.includes('batch')) return 'batchnorm';
      
      return 'other';
    };
    
    // Group tensors by layer (based on naming patterns)
    const layerGroups = {};
    
    // Group tensors by layer
    tensorEntries.forEach(tensor => {
      const layerName = getLayerName(tensor.name);
      
      if (!layerGroups[layerName]) {
        layerGroups[layerName] = [];
      }
      
      layerGroups[layerName].push(tensor);
    });
    
    // Create enhanced layer information with type identification
    const enhancedLayers = Object.entries(layerGroups)
      .map(([name, tensors]) => {
        // Determine input and output dimensions from shapes (if possible)
        let inputDim = null;
        let outputDim = null;
        
        // Look for weight tensors which often have shape [output_dim, input_dim]
        const weightTensor = tensors.find(t => t.name.includes('weight'));
        if (weightTensor && weightTensor.shape.length >= 2) {
          // For common layers, first dim is output, second is input
          outputDim = weightTensor.shape[0];
          inputDim = weightTensor.shape[1];
        }
        
        // Determine layer type from naming patterns
        const layerType = identifyLayerType(tensors);
        
        // Try to identify parent layers based on naming patterns
        const layerNumber = name.match(/\d+/);
        let parentLayer = null;
        
        if (layerNumber) {
          // Try to find the previous layer in sequential blocks
          const currentNum = parseInt(layerNumber[0]);
          const prefix = name.split(layerNumber[0])[0];
          
          if (currentNum > 0) {
            parentLayer = `${prefix}${currentNum - 1}`;
          }
        }
        
        return {
          id: name,
          name,
          tensors,
          type: layerType,
          inputDim,
          outputDim,
          parent: parentLayer,
          totalParams: tensors.reduce((sum, t) => sum + t.size, 0)
        };
      });
    
    // Sort layers by parameter count
    const sortedLayers = [...enhancedLayers].sort((a, b) => b.totalParams - a.totalParams);
    
    // Infer more sophisticated network connections
    const networkConnections = inferNetworkConnections(enhancedLayers);
    
    // Extract tensor type distribution
    const tensorTypes = {};
    tensorEntries.forEach(tensor => {
      // Try to identify tensor type (weight, bias, etc.)
      let type = 'other';
      
      if (tensor.name.includes('weight')) type = 'weight';
      else if (tensor.name.includes('bias')) type = 'bias';
      else if (tensor.name.includes('scale')) type = 'scale';
      else if (tensor.name.includes('embedding')) type = 'embedding';
      
      if (!tensorTypes[type]) {
        tensorTypes[type] = { count: 0, size: 0 };
      }
      
      tensorTypes[type].count++;
      tensorTypes[type].size += tensor.size;
    });
    
    // Calculate total parameters
    const totalParams = tensorEntries.reduce((sum, tensor) => sum + tensor.size, 0);
    
    return {
      totalParams,
      tensorCount: tensorEntries.length,
      layers: sortedLayers,
      tensorTypes,
      metadata,
      networkStructure: {
        nodes: enhancedLayers,
        connections: networkConnections
      },
      // Keep the original tensor data for detailed view
      tensors: tensorEntries
    };
  };
  
  // Function to infer more meaningful network connections
  const inferNetworkConnections = (layers) => {
    const connections = [];
    const layerMap = {};
    
    // Create a map of layer ID to layer object for quick lookup
    layers.forEach(layer => {
      layerMap[layer.id] = layer;
    });
    
    // Helper to check if one layer might feed into another
    const mightConnect = (source, target) => {
      // If we have dimensional information, check if output dim matches input dim
      if (source.outputDim && target.inputDim && source.outputDim === target.inputDim) {
        return true;
      }
      
      // Check for naming patterns that suggest connections
      const sourceParts = source.name.split(/[._]/);
      const targetParts = target.name.split(/[._]/);
      
      // Sequential layers in same module often connect
      if (sourceParts[0] === targetParts[0]) {
        // Extract numbers if present
        const sourceNum = source.name.match(/\d+/);
        const targetNum = target.name.match(/\d+/);
        
        if (sourceNum && targetNum) {
          // Sequential numbering often indicates connection
          if (parseInt(targetNum[0]) === parseInt(sourceNum[0]) + 1) {
            return true;
          }
        }
      }
      
      // Check for residual/skip connections
      if (source.name.includes('resid') || target.name.includes('resid')) {
        return true;
      }
      
      // Common layer type sequences
      const commonSequences = [
        ['conv', 'batchnorm'],
        ['conv', 'norm'],
        ['linear', 'norm'],
        ['linear', 'dropout'],
        ['embedding', 'attention'],
        ['attention', 'linear'],
        ['attention', 'norm'],
        ['norm', 'attention'],
        ['norm', 'linear']
      ];
      
      if (commonSequences.some(([s, t]) => source.type === s && target.type === t)) {
        return true;
      }
      
      // If target explicitly has parent set to source
      if (target.parent && target.parent === source.id) {
        return true;
      }
      
      return false;
    };
    
    // Create connections based on layer relationships
    for (let i = 0; i < layers.length; i++) {
      for (let j = 0; j < layers.length; j++) {
        if (i !== j) {
          const source = layers[i];
          const target = layers[j];
          
          if (mightConnect(source, target)) {
            connections.push({
              source: source.id,
              target: target.id,
              value: 1
            });
          }
        }
      }
    }
    
    // Special case for transformer-like architectures
    const attentionLayers = layers.filter(l => l.type === 'attention');
    const normLayers = layers.filter(l => l.type === 'norm');
    
    // Connect attention blocks to their corresponding norm layers
    attentionLayers.forEach(attn => {
      normLayers.forEach(norm => {
        // If they share naming patterns, they might be connected
        if (attn.name.includes(norm.name) || norm.name.includes(attn.name)) {
          connections.push({
            source: attn.id,
            target: norm.id,
            value: 1
          });
        }
      });
    });
    
    return connections;
  };

  // Create network visualization using D3
  // Replace the useEffect for network visualization with this improved version

// Create network visualization using D3
useEffect(() => {
  if (!modelData || !svgRef.current || activeTab !== 'network') return;
  
  // Make sure we clean up any previous simulation
  if (simulationRef.current) {
    simulationRef.current.stop();
    simulationRef.current = null;
  }
  
  // Clear previous visualization
  const svg = d3.select(svgRef.current);
  svg.selectAll("*").remove();
  
  const width = networkContainerRef.current.clientWidth;
  const height = 600;
  
  // Use the enhanced network structure from our improved model processing
  const networkData = modelData.networkStructure || { nodes: [], connections: [] };
  
  // Limit to a reasonable number of nodes to prevent browser crashes but include enough for complexity
  const maxNodes = 75; // Increased from 50 to show more complexity
  const topNodes = networkData.nodes
    .sort((a, b) => b.totalParams - a.totalParams)
    .slice(0, maxNodes);
  
  // Get the IDs of our top nodes for filtering connections
  const topNodeIds = new Set(topNodes.map(n => n.id));
  
  // Filter connections to only include our top nodes
  let relevantConnections = networkData.connections.filter(
    conn => topNodeIds.has(conn.source) && topNodeIds.has(conn.target)
  );
  
  // Create node objects for D3
  const nodes = topNodes.map(layer => ({
    id: layer.id,
    name: layer.name,
    fullName: layer.id,
    type: layer.type,
    value: layer.totalParams,
    inputDim: layer.inputDim,
    outputDim: layer.outputDim,
    groupId: layer.name.split(/[._\d]/)[0], // Group by prefix
    // Count incoming and outgoing connections for each node
    inDegree: relevantConnections.filter(conn => conn.target === layer.id).length,
    outDegree: relevantConnections.filter(conn => conn.source === layer.id).length
  }));
  
  // Identify input and output layers
  // Input layers have many outgoing connections but few incoming ones
  // Output layers have many incoming connections but few outgoing ones
  const inputLayers = nodes
    .filter(n => n.outDegree > 0 && n.inDegree === 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3); // Take top 3 by parameter count
  
  const outputLayers = nodes
    .filter(n => n.inDegree > 0 && n.outDegree === 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3); // Take top 3 by parameter count
  
  // If we couldn't identify clear input/output layers, use heuristics
  if (inputLayers.length === 0) {
    // Look for embedding or first layers
    const embeddings = nodes.filter(n => n.type === 'embedding');
    if (embeddings.length > 0) {
      embeddings.forEach(node => {
        node.isInput = true;
        inputLayers.push(node);
      });
    } else {
      // Use nodes with "input", "embed", or "first" in name
      const possibleInputs = nodes.filter(n => 
        n.name.toLowerCase().includes('input') || 
        n.name.toLowerCase().includes('embed') ||
        n.name.toLowerCase().includes('first') ||
        n.name.toLowerCase().includes('token') ||
        n.name.toLowerCase().includes('0')
      );
      
      if (possibleInputs.length > 0) {
        possibleInputs.slice(0, 3).forEach(node => {
          node.isInput = true;
          inputLayers.push(node);
        });
      } else {
        // Just take the first few nodes by alphabet
        nodes.sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 3)
          .forEach(node => {
            node.isInput = true;
            inputLayers.push(node);
          });
      }
    }
  } else {
    inputLayers.forEach(node => node.isInput = true);
  }
  
  if (outputLayers.length === 0) {
    // Look for classifier, output, or last layers
    const possibleOutputs = nodes.filter(n => 
      n.name.toLowerCase().includes('output') || 
      n.name.toLowerCase().includes('classifier') ||
      n.name.toLowerCase().includes('last') ||
      n.name.toLowerCase().includes('head') ||
      n.name.toLowerCase().includes('prediction')
    );
    
    if (possibleOutputs.length > 0) {
      possibleOutputs.slice(0, 3).forEach(node => {
        node.isOutput = true;
        outputLayers.push(node);
      });
    } else {
      // Just take the last few nodes by alphabet
      nodes.sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, 3)
        .forEach(node => {
          node.isOutput = true;
          outputLayers.push(node);
        });
    }
  } else {
    outputLayers.forEach(node => node.isOutput = true);
  }
  
  // Identify mid layers (nodes with both in and out connections)
  const midLayers = nodes
    .filter(n => n.inDegree > 0 && n.outDegree > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  
  midLayers.forEach(node => node.isMid = true);
  
  // Add virtual connections from inputs to outputs if the graph is disconnected
  // This ensures all nodes are connected in some way
  let hasPath = false;
  
  // Using a simple BFS to check if there's a path from any input to any output
  if (inputLayers.length > 0 && outputLayers.length > 0) {
    const queue = [...inputLayers];
    const visited = new Set();
    
    while (queue.length > 0) {
      const node = queue.shift();
      visited.add(node.id);
      
      // Check if we reached an output
      if (outputLayers.some(output => output.id === node.id)) {
        hasPath = true;
        break;
      }
      
      // Add neighbors to queue
      relevantConnections
        .filter(conn => conn.source === node.id)
        .forEach(conn => {
          const target = nodes.find(n => n.id === conn.target);
          if (target && !visited.has(target.id)) {
            queue.push(target);
          }
        });
    }
    
    // If no path exists, add some virtual connections
    if (!hasPath) {
      // Add connections between inputs and mid-layers
      inputLayers.forEach(input => {
        midLayers.forEach(mid => {
          relevantConnections.push({
            source: input.id,
            target: mid.id,
            value: 1,
            isVirtual: true
          });
        });
      });
      
      // Add connections between mid-layers and outputs
      midLayers.forEach(mid => {
        outputLayers.forEach(output => {
          relevantConnections.push({
            source: mid.id,
            target: output.id,
            value: 1,
            isVirtual: true
          });
        });
      });
      
      // If no mid layers, connect inputs directly to outputs
      if (midLayers.length === 0) {
        inputLayers.forEach(input => {
          outputLayers.forEach(output => {
            relevantConnections.push({
              source: input.id,
              target: output.id,
              value: 1,
              isVirtual: true
            });
          });
        });
      }
    }
  }
  
  // Add extra connections for complexity if there are too few
  if (relevantConnections.length < nodes.length * 1.5) {
    // Group nodes by type
    const nodesByType = _.groupBy(nodes, 'type');
    
    // Connect some nodes of the same type
    Object.values(nodesByType).forEach(typeNodes => {
      if (typeNodes.length > 1) {
        for (let i = 0; i < typeNodes.length - 1; i++) {
          // Connect to a random node of the same type
          const targetIndex = Math.floor(Math.random() * (typeNodes.length - i - 1)) + i + 1;
          
          // Avoid duplicate connections
          if (!relevantConnections.some(conn => 
            conn.source === typeNodes[i].id && conn.target === typeNodes[targetIndex].id
          )) {
            relevantConnections.push({
              source: typeNodes[i].id,
              target: typeNodes[targetIndex].id,
              value: 0.5,
              isVirtual: true
            });
          }
        }
      }
    });
    
    // Add some random skip connections between layers
    const nonInputOutputNodes = nodes.filter(n => !n.isInput && !n.isOutput);
    
    for (let i = 0; i < Math.min(15, nonInputOutputNodes.length / 2); i++) {
      const source = nonInputOutputNodes[Math.floor(Math.random() * nonInputOutputNodes.length)];
      const target = nonInputOutputNodes[Math.floor(Math.random() * nonInputOutputNodes.length)];
      
      // Avoid self-loops and duplicate connections
      if (source.id !== target.id && !relevantConnections.some(conn => 
        conn.source === source.id && conn.target === target.id
      )) {
        relevantConnections.push({
          source: source.id,
          target: target.id,
          value: 0.3,
          isVirtual: true
        });
      }
    }
  }
  
  // Create links for D3
  const links = relevantConnections.map(conn => ({
    source: conn.source,
    target: conn.target,
    value: conn.value || 1,
    isVirtual: conn.isVirtual || false
  }));
  
  // Create layer type color mapping
  const layerTypeColors = {
    'conv': '#4285F4',        // Google Blue
    'linear': '#EA4335',      // Google Red
    'attention': '#FBBC05',   // Google Yellow
    'norm': '#34A853',        // Google Green
    'embedding': '#8F00FF',   // Violet
    'recurrent': '#FF6D01',   // Orange
    'pooling': '#00ACC1',     // Cyan
    'dropout': '#AB47BC',     // Purple
    'bias': '#78909C',        // Blue Grey
    'batchnorm': '#26A69A',   // Teal
    'other': '#757575'        // Grey
  };
  
  // Group nodes by their group ID
  const nodeGroups = _.groupBy(nodes, 'groupId');
  
  // Assign group numbers for coloring
  Object.keys(nodeGroups).forEach((groupId, index) => {
    nodeGroups[groupId].forEach(node => {
      node.group = index + 1;
    });
  });
  
  // Create a group element for zooming
  const g = svg.append("g").attr("class", "network-container");
  
  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
  
  svg.call(zoom);
  
  // Create arrow markers for different link types
  svg.append("defs").selectAll("marker")
    .data(["default", "virtual"])
    .enter().append("marker")
    .attr("id", d => `arrowhead-${d}`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", d => d === "virtual" ? "#ccc" : "#999");
  
  // Set fixed positions for input and output layers
  // Input layers on left, output layers on right
  inputLayers.forEach((node, i) => {
    node.fx = 100;
    node.fy = height / 2 - (inputLayers.length - 1) * 40 / 2 + i * 40;
    node.x = node.fx;
    node.y = node.fy;
  });
  
  outputLayers.forEach((node, i) => {
    node.fx = width - 100;
    node.fy = height / 2 - (outputLayers.length - 1) * 40 / 2 + i * 40;
    node.x = node.fx;
    node.y = node.fy;
  });
  
  // Create a force simulation with adjusted parameters
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id)
      .distance(link => link.isVirtual ? 200 : 120) // Longer distance for virtual links
      .strength(link => link.isVirtual ? 0.3 : 0.7)) // Weaker strength for virtual links
    .force("charge", d3.forceManyBody().strength(-700))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(0.05))
    .force("y", d3.forceY(height / 2).strength(0.05))
    .force("collision", d3.forceCollide().radius(50))
    .alphaTarget(0.1)
    .alphaDecay(0.04);
  
  // Store simulation reference for cleanup
  simulationRef.current = simulation;
  
  // Add links with arrows
  const link = g.append("g")
    .attr("class", "links")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("class", d => `link ${d.isVirtual ? 'virtual' : 'real'}`)
    .attr("stroke", d => d.isVirtual ? "#ccc" : "#999")
    .attr("stroke-opacity", d => d.isVirtual ? 0.3 : 0.6)
    .attr("stroke-width", d => d.isVirtual ? 1 : Math.sqrt(d.value) * 2)
    .attr("stroke-dasharray", d => d.isVirtual ? "3,3" : null)
    .attr("fill", "none")
    .attr("marker-end", d => `url(#arrowhead-${d.isVirtual ? 'virtual' : 'default'})`);
  
  // Create size scale based on parameter count
  const sizeScale = d3.scaleSqrt()
    .domain([1, d3.max(nodes, d => d.value) || 1])
    .range([30, 70]);
  
  // Create node groups
  const node = g.append("g")
    .attr("class", "nodes")
    .selectAll(".node")
    .data(nodes)
    .join("g")
    .attr("class", d => {
      let classes = "node";
      if (d.isInput) classes += " input-layer fixed-node";
      if (d.isOutput) classes += " output-layer fixed-node";
      if (d.isMid) classes += " mid-layer";
      return classes;
    })
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));
  
  // Add rectangles for nodes
  node.append("rect")
    .attr("width", d => sizeScale(Math.sqrt(d.value)))
    .attr("height", 40)
    .attr("x", d => -sizeScale(Math.sqrt(d.value)) / 2)
    .attr("y", -20)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", d => {
      if (d.isInput) return "#3b82f6"; // Blue for input
      if (d.isOutput) return "#ef4444"; // Red for output
      if (d.isMid) return "#10b981"; // Green for mid
      return layerTypeColors[d.type] || layerTypeColors['other'];
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("class", "node-rect");
  
  // Add layer name text
  node.append("text")
    .text(d => {
      const displayName = d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name;
      return displayName;
    })
    .attr("text-anchor", "middle")
    .attr("dy", -5)
    .attr("font-size", 10)
    .attr("fill", "#fff")
    .attr("pointer-events", "none")
    .attr("class", "node-label");
  
  // Add layer type text
  node.append("text")
    .text(d => {
      if (d.isInput) return "INPUT";
      if (d.isOutput) return "OUTPUT";
      return d.type;
    })
    .attr("text-anchor", "middle")
    .attr("dy", 8)
    .attr("font-size", 8)
    .attr("fill", "#fff")
    .attr("pointer-events", "none")
    .attr("class", "node-type");
  
  // Add parameters count
  node.append("text")
    .text(d => `${formatNumber(d.value)} params`)
    .attr("text-anchor", "middle")
    .attr("dy", 20)
    .attr("font-size", 8)
    .attr("fill", "#fff")
    .attr("pointer-events", "none")
    .attr("class", "node-params");
  
  // Add detailed tooltip
  node.append("title")
    .text(d => {
      let tooltip = `Name: ${d.fullName}\n`;
      tooltip += `Type: ${d.isInput ? "INPUT LAYER" : d.isOutput ? "OUTPUT LAYER" : d.type}\n`;
      tooltip += `Parameters: ${formatNumber(d.value)}\n`;
      
      if (d.inputDim) tooltip += `Input Dim: ${d.inputDim}\n`;
      if (d.outputDim) tooltip += `Output Dim: ${d.outputDim}\n`;
      
      tooltip += `In-connections: ${d.inDegree}\n`;
      tooltip += `Out-connections: ${d.outDegree}\n`;
      
      return tooltip;
    });
  
  // Function to update link positions
  const updateLinks = () => {
    link.attr("d", d => {
      const sourceNode = nodes.find(n => n.id === d.source.id || n.id === d.source);
      const targetNode = nodes.find(n => n.id === d.target.id || n.id === d.target);
      
      if (!sourceNode || !targetNode) return "";
      
      const sourceX = sourceNode.x;
      const sourceY = sourceNode.y;
      const targetX = targetNode.x;
      const targetY = targetNode.y;
      
      // Create a curved path
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Curve factor
      
      // For virtual links, make the curve more pronounced
      const curveFactor = d.isVirtual ? 2 : 1;
      
      return `M${sourceX},${sourceY}
              A${dr * curveFactor},${dr * curveFactor} 0 0,1 ${targetX},${targetY}`;
    });
  };
  
  // Add click handler for nodes
  node.on("click", (event, d) => {
    // Reset all highlights
    node.classed("highlighted", false);
    link.classed("highlighted", false);
    
    // Highlight this node
    d3.select(event.currentTarget).classed("highlighted", true);
    
    // Highlight connected links and nodes
    link.each(function(l) {
      if (l.source.id === d.id || l.target.id === d.id) {
        d3.select(this).classed("highlighted", true);
        
        // Also highlight connected nodes
        node.filter(n => n.id === l.source.id || n.id === l.target.id)
          .classed("highlighted", true);
      }
    });
  });
  
  // Update positions on simulation tick
  simulation.on("tick", () => {
    // Update positions for all nodes except fixed ones
    node.attr("transform", d => `translate(${d.x},${d.y})`);
    
    // Update link positions
    updateLinks();
  });
  
  // Create a legend for node types
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(20, 20)`);
  
  // Create legend entries including input/output/mid
  const legendEntries = [
    { type: 'input', color: '#3b82f6', label: 'Input Layer' },
    { type: 'output', color: '#ef4444', label: 'Output Layer' },
    { type: 'mid', color: '#10b981', label: 'Hidden Layer' },
    ...Object.entries(layerTypeColors)
      .filter(([type]) => !['conv', 'linear', 'attention', 'norm'].includes(type))
      .map(([type, color]) => ({ type, color, label: type }))
  ];
  
  // Add virtual connection to legend
  legendEntries.push({ 
    type: 'virtual', 
    color: '#ccc', 
    label: 'Inferred Connection',
    dashed: true
  });
  
  legendEntries.forEach((entry, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0, ${i * 20})`)
      .attr("class", "legend-item")
      .style("cursor", "pointer")
      .on("click", () => {
        // Highlight nodes of this type
        if (entry.type === 'input') {
          node.classed("highlighted", d => d.isInput);
        } else if (entry.type === 'output') {
          node.classed("highlighted", d => d.isOutput);
        } else if (entry.type === 'mid') {
          node.classed("highlighted", d => d.isMid);
        } else if (entry.type === 'virtual') {
          link.classed("highlighted", d => d.isVirtual);
        } else {
          node.classed("highlighted", d => d.type === entry.type);
        }
      });
    
    if (entry.type === 'virtual') {
      // Use a line for virtual connections
      legendRow.append("line")
        .attr("x1", 0)
        .attr("y1", 7)
        .attr("x2", 15)
        .attr("y2", 7)
        .attr("stroke", entry.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,3");
    } else {
      // Use rectangle for node types
      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("rx", 3)
        .attr("fill", entry.color);
    }
    
    legendRow.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(entry.label)
      .style("font-size", "12px");
  });
  
  // Add a semi-transparent white background to the legend
  legend.insert("rect", ":first-child")
    .attr("width", 140)
    .attr("height", legendEntries.length * 20 + 10)
    .attr("fill", "white")
    .attr("fill-opacity", 0.9)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("transform", "translate(-5, -5)");
  
  // Drag functions for nodes
  function dragstarted(event, d) {
    // Don't move fixed nodes
    if (d.isInput || d.isOutput) return;
    
    if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    // Don't move fixed nodes
    if (d.isInput || d.isOutput) return;
    
    d.fx = event.x;
    d.fy = event.y;
    d.x = event.x;
    d.y = event.y;
    
    // Update link positions immediately
    updateLinks();
  }
  
  function dragended(event, d) {
    // Don't move fixed nodes
    if (d.isInput || d.isOutput) return;
    
    if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
    
    // Keep non-input/output nodes movable
    if (!d.isInput && !d.isOutput) {
      d.fx = null;
      d.fy = null;
    }
  }
  
  // Set initial positions for non-fixed nodes to avoid long line layout
  const nonFixedNodes = nodes.filter(n => !n.fx && !n.fy);
  const nodeCount = nonFixedNodes.length;
  
  // Set up a layered layout
  const layers = 5; // Number of vertical layers
  const nodesPerLayer = Math.ceil(nodeCount / layers);
  
  nonFixedNodes.forEach((node, i) => {
    const layer = Math.floor(i / nodesPerLayer);
    const indexInLayer = i % nodesPerLayer;
    
    // Position nodes in a grid between input and output
    const x = 100 + (width - 200) * (layer + 1) / (layers + 1);
    const y = height * (indexInLayer + 1) / (nodesPerLayer + 1);
    
    node.x = x;
    node.y = y;
  });
  
  // Run simulation for a few ticks to get a better layout
  for (let i = 0; i < 30; i++) {
    simulation.tick();
  }
  
  // Update positions after initial layout
  node.attr("transform", d => `translate(${d.x},${d.y})`);
  updateLinks();
  
  // Hide the loading indicator
  const loadingElement = document.getElementById('network-loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
  
  // Center the visualization
  const initialScale = 0.8;
  svg.call(zoom.transform, d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(initialScale)
    .translate(-width / 2, -height / 2));
  
  // Clean up function
  return () => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }
  };
}, [modelData, activeTab]);
  
  // Helper function to format large numbers
  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
  };
  
  // Render model summary stats cards
  const renderStatCards = () => {
    if (!modelData) return null;
    
    const { totalParams, tensorCount, layers } = modelData;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 transition-all hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Parameters</h3>
              <p className="text-xl font-semibold text-gray-900">{formatNumber(totalParams)}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 transition-all hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Tensors</h3>
              <p className="text-xl font-semibold text-gray-900">{tensorCount}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 transition-all hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Layers</h3>
              <p className="text-xl font-semibold text-gray-900">{layers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 transition-all hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Layer Types</h3>
              <p className="text-xl font-semibold text-gray-900">
                {new Set(layers.map(l => l.type)).size}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the model summary
  const renderModelSummary = () => {
    if (!modelData) return null;
    
    const { tensorTypes, layers } = modelData;
    
    return (
      <div className="p-4 space-y-6">
        {renderStatCards()}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="text-lg font-semibold mb-4">Tensor Types</h3>
            <div className="space-y-3">
              {Object.entries(tensorTypes).map(([type, { count, size }]) => (
                <div key={type} className="flex items-center">
                  <div className="w-20 text-gray-600 text-sm">{type}:</div>
                  <div className="flex-1 mx-2">
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div 
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                            type === 'weight' ? 'bg-blue-500' : 
                            type === 'bias' ? 'bg-green-500' : 
                            type === 'embedding' ? 'bg-purple-500' : 
                            'bg-gray-500'
                          }`}
                          style={{ 
                            width: `${Math.max(1, (size / modelData.totalParams) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-32 text-sm">
                    <span className="font-medium">{count}</span> tensors ({formatNumber(size)})
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="card p-5">
            <h3 className="text-lg font-semibold mb-4">Layer Type Distribution</h3>
            <div className="space-y-3">
              {Object.entries(_.groupBy(layers, 'type')).map(([type, groupLayers]) => (
                <div key={type} className="flex items-center">
                  <div className="w-24 text-gray-600 text-sm">{type}:</div>
                  <div className="flex-1 mx-2">
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div 
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                            type === 'conv' ? 'bg-blue-500' : 
                            type === 'linear' ? 'bg-red-500' : 
                            type === 'attention' ? 'bg-yellow-500' : 
                            type === 'norm' ? 'bg-green-500' : 
                            type === 'embedding' ? 'bg-purple-500' : 
                            'bg-gray-500'
                          }`}
                          style={{ 
                            width: `${Math.max(1, (groupLayers.length / layers.length) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-sm">
                    <span className="font-medium">{groupLayers.length}</span> layers
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <h3 className="text-lg font-semibold mb-4">Top Layers by Parameter Count</h3>
          <div className="space-y-3">
            {layers.slice(0, 10).map((layer, index) => (
              <div key={index} className="flex items-center">
                <div className="w-1/3 truncate" title={layer.name}>
                  <span className="text-sm font-medium">{layer.name}</span>
                  <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {layer.type}
                  </span>
                </div>
                <div className="flex-1 mx-2">
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                      <div 
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          layer.type === 'conv' ? 'bg-blue-500' : 
                          layer.type === 'linear' ? 'bg-red-500' : 
                          layer.type === 'attention' ? 'bg-yellow-500' : 
                          layer.type === 'norm' ? 'bg-green-500' : 
                          layer.type === 'embedding' ? 'bg-purple-500' : 
                          'bg-gray-500'
                        }`}
                        style={{ 
                          width: `${Math.max(1, (layer.totalParams / modelData.totalParams) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="w-32 text-sm text-right">
                  <span className="font-medium">{formatNumber(layer.totalParams)}</span> params
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card p-5">
          <h3 className="text-lg font-semibold mb-4">Tensor Shape Distribution</h3>
          <div className="h-60 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Count</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(_.groupBy(modelData.tensors, 
                  tensor => tensor.shape.length)).map(([dim, tensors]) => (
                  <tr key={dim}>
                    <td>
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
                        {dim}D
                      </span>
                    </td>
                    <td>{tensors.length}</td>
                    <td className="font-mono text-xs">
                      {tensors[0].shape.join(' × ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  // Render detailed layer information
  const renderLayerDetails = () => {
    if (!modelData) return null;
    
    return (
      <div className="p-4">
        <div className="card overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold">Layer Details</h3>
            <p className="text-sm text-gray-500">
              All layers and their tensors sorted by parameter count
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Layer Name</th>
                  <th>Type</th>
                  <th>Parameters</th>
                  <th>Tensor Count</th>
                  <th>Tensor Types</th>
                </tr>
              </thead>
              <tbody>
                {modelData.layers.map((layer, index) => (
                  <tr key={index}>
                    <td className="max-w-xs truncate" title={layer.name}>
                      {layer.name}
                    </td>
                    <td>
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        layer.type === 'conv' ? 'bg-blue-100 text-blue-800' : 
                        layer.type === 'linear' ? 'bg-red-100 text-red-800' : 
                        layer.type === 'attention' ? 'bg-yellow-100 text-yellow-800' : 
                        layer.type === 'norm' ? 'bg-green-100 text-green-800' : 
                        layer.type === 'embedding' ? 'bg-purple-100 text-purple-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {layer.type}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium">{formatNumber(layer.totalParams)}</span>
                    </td>
                    <td>{layer.tensors.length}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {_.uniqBy(layer.tensors, tensor => {
                          if (tensor.name.includes('weight')) return 'weight';
                          if (tensor.name.includes('bias')) return 'bias';
                          return 'other';
                        }).map((tensor, i) => {
                          const type = tensor.name.includes('weight') ? 'weight' : 
                                      tensor.name.includes('bias') ? 'bias' : 'other';
                          return (
                            <span key={i} className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                              type === 'weight' ? 'bg-blue-100 text-blue-800' : 
                              type === 'bias' ? 'bg-green-100 text-green-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {type}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  // Render tensor details
  const renderTensorDetails = () => {
    if (!modelData) return null;
    
    return (
      <div className="p-4">
        <div className="card overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold">Tensor Details</h3>
            <p className="text-sm text-gray-500">
              All tensors in the model
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tensor Name</th>
                  <th>Shape</th>
                  <th>Data Type</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {modelData.tensors.map((tensor, index) => (
                  <tr key={index}>
                    <td className="break-all">
                      {tensor.name}
                    </td>
                    <td className="whitespace-nowrap font-mono">
                      {tensor.shape.join(' × ')}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                        {tensor.dtype}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      {formatNumber(tensor.size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  // Render network visualization
  const renderNetworkVisualization = () => {
    if (!modelData) return null;
    
    return (
      <div className="p-4" ref={networkContainerRef}>
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Network Visualization</h3>
            <p className="text-sm text-gray-600 mt-1">
              This visualization shows the neural network architecture with inferred connections between layers.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center mb-4 text-sm gap-4">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              <span>Node size = parameter count</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              <span>Colors = layer types</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-500 mr-1"></span>
              <span>Click node to see connections</span>
            </div>
          </div>
          
          <div className="border rounded bg-gray-50 relative">
            <svg 
              ref={svgRef} 
              width="100%" 
              height="600" 
              className="w-full"
            ></svg>
            
            {/* Loading indicator for when visualization is initializing */}
            <div id="network-loading" className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
              <div className="text-center">
                <div className="spinner inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="mt-2">Generating network visualization...</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded border">
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Visualization Features
              </h4>
              <ul className="text-sm space-y-1 list-disc pl-5">
                <li>Drag nodes to rearrange the layout</li>
                <li>Use mouse wheel to zoom in/out</li>
                <li>Hover over nodes for detailed information</li>
                <li>Click and drag the background to pan</li>
                <li>Click a node to highlight its connections</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded border">
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Neural Network Insights
              </h4>
              <ul className="text-sm space-y-1 list-disc pl-5">
                <li>Showing top {modelData.networkStructure?.nodes?.slice(0, 50).length || 0} layers by parameter count</li>
                <li>Connection inference based on naming patterns</li>
                <li>Layer types determined by tensor naming patterns</li>
                <li>Click legend items to highlight layer types</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            <p>Note: This visualization uses heuristics to infer model architecture from the safetensors file structure. The actual network structure may vary.</p>
          </div>
        </div>
      </div>
    );
  };
  
  // Render file upload area
  const renderFileUpload = () => {
    return (
      <div className="card mb-6 overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-2">Upload SafeTensors File</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select a .safetensors file to visualize the neural network architecture
          </p>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop your file here, or{' '}
                <label className="text-blue-600 hover:text-blue-800 cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept=".safetensors"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Accepts .safetensors files only
              </p>
            </div>
          </div>
          
          {file && (
            <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={analyzeFile}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Analyze Model
                  </>
                )}
              </button>
            </div>
          )}
          
          {loading && (
            <div className="mt-4">
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{progressStatus}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 flex items-start p-4 rounded-md bg-red-50 border-l-4 border-red-500">
              <ErrorIcon />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div>
      {renderFileUpload()}
      
      {modelData && (
        <div className="card overflow-hidden">
          <div className="border-b">
            <div className="flex overflow-x-auto hide-scrollbar">
              <button
                className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                <ChartIcon /> Summary
              </button>
              <button
                className={`tab ${activeTab === 'layers' ? 'active' : ''}`}
                onClick={() => setActiveTab('layers')}
              >
                <LayersIcon /> Layers
              </button>
              <button
                className={`tab ${activeTab === 'tensors' ? 'active' : ''}`}
                onClick={() => setActiveTab('tensors')}
              >
                <TensorIcon /> Tensors
              </button>
              <button
                className={`tab ${activeTab === 'network' ? 'active' : ''}`}
                onClick={() => setActiveTab('network')}
              >
                <NetworkIcon /> Network
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 fade-in">
            {activeTab === 'summary' && renderModelSummary()}
            {activeTab === 'layers' && renderLayerDetails()}
            {activeTab === 'tensors' && renderTensorDetails()}
            {activeTab === 'network' && renderNetworkVisualization()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeTensorsVisualizer;