import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

const SafeTensorsVisualizer = () => {
  const [file, setFile] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [progressStatus, setProgressStatus] = useState('');
  
  // For visualization
  const svgRef = useRef(null);
  const networkContainerRef = useRef(null);
  
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
  useEffect(() => {
    if (!modelData || !svgRef.current || activeTab !== 'network') return;
    
    // Clear previous visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = networkContainerRef.current.clientWidth;
    const height = 600;
    
    // Use the enhanced network structure from our improved model processing
    const networkData = modelData.networkStructure || { nodes: [], connections: [] };
    
    // Limit to a reasonable number of nodes to prevent browser crashes
    const maxNodes = 50;
    const topNodes = networkData.nodes
      .sort((a, b) => b.totalParams - a.totalParams)
      .slice(0, maxNodes);
    
    // Get the IDs of our top nodes for filtering connections
    const topNodeIds = new Set(topNodes.map(n => n.id));
    
    // Filter connections to only include our top nodes
    const relevantConnections = networkData.connections.filter(
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
      groupId: layer.name.split(/[._\d]/)[0] // Group by prefix
    }));
    
    // Create links for D3
    const links = relevantConnections.map(conn => ({
      source: conn.source,
      target: conn.target,
      value: conn.value || 1
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
    
    // Create dagre graph for hierarchical layout
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setGraph({});
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Add nodes to dagre graph
    nodes.forEach(node => {
      dagreGraph.setNode(node.id, { 
        width: 180,  // Width of node 
        height: 40   // Height of node
      });
    });
    
    // Add edges to dagre graph
    links.forEach(link => {
      dagreGraph.setEdge(link.source, link.target);
    });
    
    // Run dagre layout algorithm
    dagre.layout(dagreGraph);
    
    // Apply positions from dagre
    nodes.forEach(node => {
      const dagreNode = dagreGraph.node(node.id);
      node.x = dagreNode.x;
      node.y = dagreNode.y;
    });
    
    // Create a group element for zooming
    const g = svg.append("g");
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Create arrow markers for different link types
    svg.append("defs").selectAll("marker")
      .data(["default"])
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
      .attr("fill", "#999");
    
    // Add links with arrows
    const link = g.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        const targetNode = nodes.find(n => n.id === d.target);
        
        if (!sourceNode || !targetNode) return "";
        
        return `M${sourceNode.x},${sourceNode.y}L${targetNode.x},${targetNode.y}`;
      })
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.sqrt(d.value) * 2)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrowhead-default)");
    
    // Create size scale based on parameter count
    const sizeScale = d3.scaleSqrt()
      .domain([1, d3.max(nodes, d => d.value) || 1])
      .range([30, 80]);
    
    // Create node groups
    const node = g.append("g")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
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
      .attr("fill", d => layerTypeColors[d.type] || layerTypeColors['other'])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
    
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
      .attr("pointer-events", "none");
    
    // Add layer type text
    node.append("text")
      .text(d => d.type)
      .attr("text-anchor", "middle")
      .attr("dy", 8)
      .attr("font-size", 8)
      .attr("fill", "#fff")
      .attr("pointer-events", "none");
    
    // Add parameters count
    node.append("text")
      .text(d => `${formatNumber(d.value)} params`)
      .attr("text-anchor", "middle")
      .attr("dy", 20)
      .attr("font-size", 8)
      .attr("fill", "#fff")
      .attr("pointer-events", "none");
    
    // Add detailed tooltip
    node.append("title")
      .text(d => {
        let tooltip = `Name: ${d.fullName}\n`;
        tooltip += `Type: ${d.type}\n`;
        tooltip += `Parameters: ${formatNumber(d.value)}\n`;
        
        if (d.inputDim) tooltip += `Input Dim: ${d.inputDim}\n`;
        if (d.outputDim) tooltip += `Output Dim: ${d.outputDim}\n`;
        
        return tooltip;
      });
    
    // Center and fit the visualization
    const initialScale = 0.85;
    const svgBounds = svg.node().getBoundingClientRect();
    
    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      const halfWidth = sizeScale(Math.sqrt(node.value)) / 2;
      minX = Math.min(minX, node.x - halfWidth);
      maxX = Math.max(maxX, node.x + halfWidth);
      minY = Math.min(minY, node.y - 20);
      maxY = Math.max(maxY, node.y + 20);
    });
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    // Compute the translation to center the graph
    const tx = (svgBounds.width - graphWidth * initialScale) / 2 - minX * initialScale;
    const ty = (svgBounds.height - graphHeight * initialScale) / 2 - minY * initialScale;
    
    // Apply initial transform
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(tx, ty)
      .scale(initialScale));
    
    // Create a legend for layer types
    const legend = svg.append("g")
      .attr("transform", `translate(20, 20)`);
    
    const legendEntries = Object.entries(layerTypeColors);
    
    legendEntries.forEach(([type, color], i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
      
      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color);
      
      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(type)
        .style("font-size", "12px");
    });
    
    // Add a semi-transparent white background to the legend
    legend.insert("rect", ":first-child")
      .attr("width", 100)
      .attr("height", legendEntries.length * 20 + 10)
      .attr("fill", "white")
      .attr("fill-opacity", 0.8)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("transform", "translate(-5, -5)");
    
    // Drag functions for nodes
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
      d.x = event.x;
      d.y = event.y;
      
      // Update link positions
      link.filter(l => l.source === d.id || l.target === d.id)
        .attr("d", l => {
          const source = nodes.find(n => n.id === l.source);
          const target = nodes.find(n => n.id === l.target);
          return `M${source.x},${source.y}L${target.x},${target.y}`;
        });
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Add dagre.js library dynamically
    if (typeof dagre === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
    
    return () => {
      if (simulation) simulation.stop();
    };
  }, [modelData, activeTab]);
  
  // Helper function to format large numbers
  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
  };
  
  // Render the model summary
  const renderModelSummary = () => {
    if (!modelData) return null;
    
    const { totalParams, tensorCount, layers, tensorTypes } = modelData;
    
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Model Overview</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-600">Total Parameters:</div>
              <div className="font-medium">{formatNumber(totalParams)}</div>
              
              <div className="text-gray-600">Tensor Count:</div>
              <div className="font-medium">{tensorCount}</div>
              
              <div className="text-gray-600">Layer Count:</div>
              <div className="font-medium">{layers.length}</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Tensor Types</h3>
            <div className="space-y-2">
              {Object.entries(tensorTypes).map(([type, { count, size }]) => (
                <div key={type} className="flex items-center">
                  <div className="w-20 text-gray-600">{type}:</div>
                  <div className="flex-1 mx-2">
                    <div className="bg-blue-500 h-4 rounded" 
                      style={{ 
                        width: `${Math.max(1, (size / totalParams) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="w-32 text-sm">
                    {count} tensors ({formatNumber(size)})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-3">Top Layers by Parameter Count</h3>
          <div className="space-y-2">
            {layers.slice(0, 10).map((layer, index) => (
              <div key={index} className="flex items-center">
                <div className="w-1/3 truncate" title={layer.name}>{layer.name}</div>
                <div className="flex-1 mx-2">
                  <div className="bg-green-500 h-4 rounded" 
                    style={{ 
                      width: `${Math.max(1, (layer.totalParams / totalParams) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="w-32 text-sm">
                  {formatNumber(layer.totalParams)} params
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Tensor Shape Distribution</h3>
          <div className="h-60 overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Dimension</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Count</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(_.groupBy(modelData.tensors, 
                  tensor => tensor.shape.length)).map(([dim, tensors]) => (
                  <tr key={dim} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{dim}D</td>
                    <td className="px-4 py-2">{tensors.length}</td>
                    <td className="px-4 py-2 font-mono text-xs">
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Layer Details</h3>
            <p className="text-sm text-gray-500">
              All layers and their tensors sorted by parameter count
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Layer Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parameters
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tensor Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tensor Types
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modelData.layers.map((layer, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{layer.name}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(layer.totalParams)}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{layer.tensors.length}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm text-gray-700">
                        {_.uniqBy(layer.tensors, tensor => {
                          if (tensor.name.includes('weight')) return 'weight';
                          if (tensor.name.includes('bias')) return 'bias';
                          return 'other';
                        }).map(tensor => (
                          tensor.name.includes('weight') ? 'weight' : 
                          tensor.name.includes('bias') ? 'bias' : 'other'
                        )).join(', ')}
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Tensor Details</h3>
            <p className="text-sm text-gray-500">
              All tensors in the model
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tensor Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shape
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modelData.tensors.map((tensor, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2">
                      <div className="text-sm font-medium text-gray-900 break-all">{tensor.name}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-mono">
                        {tensor.shape.join(' × ')}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm">{tensor.dtype}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm">{formatNumber(tensor.size)}</div>
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
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Network Visualization</h3>
          <p className="text-sm text-gray-600 mb-4">
            Showing top 30 layers by parameter count. Drag nodes to reorganize, scroll to zoom.
          </p>
          <div className="border rounded bg-gray-50">
            <svg 
              ref={svgRef} 
              width="100%" 
              height="600" 
              className="w-full"
            ></svg>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Note: This visualization is simplified and may not accurately represent all model connections.
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <h1 className="text-3xl font-bold">SafeTensors Neural Network Visualizer</h1>
          <p className="mt-2 opacity-90">
            Upload a SafeTensors file to visualize and analyze the neural network structure
          </p>
        </div>
        
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select a SafeTensors file
              </label>
              <input
                type="file"
                accept=".safetensors"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {file && (
                <p className="mt-1 text-sm text-gray-500">
                  {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>
            <button
              onClick={analyzeFile}
              disabled={!file || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : 'Analyze Model'}
            </button>
          </div>
          
          {loading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{progressStatus}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <div className="flex">
                <div className="py-1">
                  <svg className="h-6 w-6 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {modelData && (
          <div>
            <div className="border-b">
              <nav className="flex -mb-px">
                <button
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'summary' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('summary')}
                >
                  Summary
                </button>
                <button
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'layers' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('layers')}
                >
                  Layers
                </button>
                <button
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'tensors' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('tensors')}
                >
                  Tensors
                </button>
                <button
                  className={`py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === 'network' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('network')}
                >
                  Network Visualization
                </button>
              </nav>
            </div>
            
            <div className="bg-gray-50">
              {activeTab === 'summary' && renderModelSummary()}
              {activeTab === 'layers' && renderLayerDetails()}
              {activeTab === 'tensors' && renderTensorDetails()}
              {activeTab === 'network' && renderNetworkVisualization()}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>This tool works entirely in your browser. No data is uploaded to any server.</p>
      </div>
    </div>
  );
};

export default SafeTensorsVisualizer;