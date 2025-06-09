class GraphVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.nodes = new Map();
        this.edges = [];
        this.dragging = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.simulation = {
            springLength: 100,
            springStrength: 0.1,
            repulsion: 1000,
            damping: 0.5,
            centerForce: 0.1,
            labelForce: 0.2,  // Added new parameter
            boundaryPadding: 50,
            minScale: 0.1,
            maxScale: 5,
            stopThreshold: 0.1  // Add threshold for stopping movement
        };
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
        this.highlightedNode = null;
        this.highlightedEdge = null;
        this.updateTimeout = null;
        this.lastDrawTime = 0;
        this.frameRate = 30; // 30 FPS max
        this.updateInterval = null;
        this.autoUpdateRate = 100; // Auto update every 100 ms
        this.labelCenters = new Map(); // Add storage for label centers

        // Initialize canvas first
        this.initCanvas();

        // Then set boundaries based on canvas size
        this.viewportWidth = 2000;  // Default viewport size
        this.viewportHeight = 1500;
        this.boundaries = {
            left: -this.viewportWidth/2,
            right: this.viewportWidth/2,
            top: -this.viewportHeight/2,
            bottom: this.viewportHeight/2
        };
        
        this.setupEventListeners();
        this.startAutoUpdate();
    }

    initCanvas() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.container.appendChild(this.canvas);
    }

    setupEventListeners() {
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('mousedown', this.handlePanStart.bind(this));
        document.addEventListener('mousemove', this.handlePanMove.bind(this));
        document.addEventListener('mouseup', this.handlePanEnd.bind(this));
    }

    startAutoUpdate() {
        if (!this.updateInterval) {
            this.updateInterval = setInterval(() => {
                this.applyForces();
                this.requestUpdate();
            }, this.autoUpdateRate);
        }
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    addNode(id, label) {
        id = `${id}`;
        // Place nodes within viewport boundaries instead of canvas
        const x = this.boundaries.left + Math.random() * (this.canvas.width - 100) + 50;
        const y = this.boundaries.top + Math.random() * (this.canvas.height - 100) + 50;

        const node = {
            id,
            label,
            x,
            y,
            radius: 30,
            vx: 0,
            vy: 0
        };
        
        this.nodes.set(id, node);
        this.calculateBoundaries();
        this.updateTables();
        this.applyForces();
        this.draw();
    }

    addEdge(sourceId, targetId, label = '') {
        sourceId = `${sourceId}`;
        targetId = `${targetId}`;
        label = `${label}`;
        if (this.nodes.has(sourceId) && this.nodes.has(targetId)) {
            this.edges.push({
                source: sourceId,
                target: targetId,
                label
            });
            this.updateTables();
            this.draw();
        }
    }

    clear() {
        this.stopAutoUpdate();
        this.nodes.clear();
        this.edges = [];
        this.updateTables();
        this.draw();
        this.startAutoUpdate();
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        for (const node of this.nodes.values()) {
            const dx = mouseX - node.x;
            const dy = mouseY - node.y;
            if (dx * dx + dy * dy < node.radius * node.radius) {
                this.dragging = node;
                this.offsetX = dx;
                this.offsetY = dy;
                break;
            }
        }
    }

    handleMouseMove(e) {
        if (this.dragging) {
            const rect = this.canvas.getBoundingClientRect();
            this.dragging.x = e.clientX - rect.left - this.offsetX;
            this.dragging.y = e.clientY - rect.top - this.offsetY;
            this.requestUpdate();
        }
    }

    handleMouseUp() {
        this.dragging = null;
    }

    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoom = e.deltaY < 0 ? 1.1 : 0.9;
        this.scale *= zoom;
        this.scale = Math.min(Math.max(this.simulation.minScale, this.scale), this.simulation.maxScale);
        
        // Update boundaries based on node positions after zoom
        this.calculateBoundaries();
        
        this.draw();
    }

    handlePanStart(e) {
        if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle button or Alt+Left click
            this.isPanning = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            e.preventDefault();
        }
    }

    handlePanMove(e) {
        if (this.isPanning) {
            this.translateX += e.clientX - this.lastX;
            this.translateY += e.clientY - this.lastY;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.requestUpdate();
        }
    }

    handlePanEnd() {
        this.isPanning = false;
    }

    requestUpdate() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.updateTimeout = setTimeout(() => {
            this.draw();
        }, 1000 / this.frameRate);
    }

    updateSimulationParams(params) {
        Object.assign(this.simulation, params);
        // Clamp current scale to new limits
        this.scale = Math.min(Math.max(this.simulation.minScale, this.scale), this.simulation.maxScale);
        this.draw();
    }

    updateBoundaries(newBoundaries) {
        Object.assign(this.boundaries, newBoundaries);
        // Update input fields with actual values
        document.getElementById('boundary-left').value = this.boundaries.left;
        document.getElementById('boundary-right').value = this.boundaries.right;
        document.getElementById('boundary-top').value = this.boundaries.top;
        document.getElementById('boundary-bottom').value = this.boundaries.bottom;
        this.draw();
    }

    updateViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.resetBoundaries();
    }

    resetBoundaries() {
        this.boundaries = {
            left: -this.viewportWidth/2,
            right: this.viewportWidth/2,
            top: -this.viewportHeight/2,
            bottom: this.viewportHeight/2
        };
        this.draw();
    }

    calculateBoundaries(){
        this.calculateBoundariesFromConvas()
    }
    calculateBoundariesFromConvas() {
        if (this.nodes.size === 0) return this.resetBoundaries();

        const padding = 100;

        this.boundaries = {
            left: 0,
            right:  this.canvas.width / this.scale,
            top: 0 ,
            bottom: this.canvas.height / this.scale
        };
    }

    calculateBoundariesFromNodes() {
        if (this.nodes.size === 0) return this.resetBoundaries();

        const padding = 100;
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        // Find min/max coordinates from all nodes
        for (const node of this.nodes.values()) {
            minX = Math.min(minX, node.x - node.radius);
            minY = Math.min(minY, node.y - node.radius);
            maxX = Math.max(maxX, node.x + node.radius);
            maxY = Math.max(maxY, node.y + node.radius);
        }

            minX = Math.max(minX, -1000);
            minY = Math.max(minY, -1000);
            maxX = Math.min(maxX, 1000);
            maxY = Math.min(maxY, 1000);

        // Add padding and update boundaries
        this.boundaries = {
            left: minX - padding,
            right: maxX + padding,
            top: minY - padding,
            bottom: maxY + padding
        };
    }

    isNodesConnected(node1Id, node2Id) {
        return this.edges.some(edge => 
            (edge.source === node1Id && edge.target === node2Id) ||
            (edge.source === node2Id && edge.target === node1Id)
        );
    }

    applyForces() {
        if (this.dragging) return;

        // Calculate centers for each label group
        this.labelCenters.clear();
        const labelGroups = new Map();
        
        for (const node of this.nodes.values()) {
            if (!labelGroups.has(node.label)) {
                labelGroups.set(node.label, { count: 0, sumX: 0, sumY: 0 });
            }
            const group = labelGroups.get(node.label);
            group.count++;
            group.sumX += node.x;
            group.sumY += node.y;
        }

        // Calculate average position for each label
        for (const [label, group] of labelGroups) {
            this.labelCenters.set(label, {
                x: group.sumX / group.count,
                y: group.sumY / group.count
            });
        }

        let totalMovement = 0;
        const nodeArray = Array.from(this.nodes.values());
        const centerX = (this.boundaries.left + this.boundaries.right) / 2;
        const centerY = (this.boundaries.top + this.boundaries.bottom) / 2;
        
        for (let i = 0; i < nodeArray.length; i++) {
            const node1 = nodeArray[i];
            
            // Modified center gravity force that increases with distance
            const dx = centerX - node1.x;
            const dy = centerY - node1.y;
            const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
            
            // Combined gravity and repulsion from center
            const gravityForce = this.simulation.centerForce * distanceToCenter / 100;
            const centerRepulsion = this.simulation.centerForce * 1000 / (distanceToCenter * distanceToCenter);
            const netForce = gravityForce - centerRepulsion;
            
            node1.vx += (dx / distanceToCenter) * netForce;
            node1.vy += (dy / distanceToCenter) * netForce;
            
            // Add gravity towards label center
            const labelCenter = this.labelCenters.get(node1.label);
            if (labelCenter) {
                const labelDx = labelCenter.x - node1.x;
                const labelDy = labelCenter.y - node1.y;
                const labelDistance = Math.sqrt(labelDx * labelDx + labelDy * labelDy) || 1;
                const labelGravity = this.simulation.labelForce * labelDistance;
                
                node1.vx += (labelDx / labelDistance) * labelGravity;
                node1.vy += (labelDy / labelDistance) * labelGravity;
            }
            
            // Repulsion between nodes with overlap prevention
            for (let j = i + 1; j < nodeArray.length; j++) {
                const node2 = nodeArray[j];
                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                // Calculate minimum safe distance (sum of radii plus padding)
                const minDistance = node1.radius + node2.radius + 60;
                
                // Base repulsion force
                let force = this.simulation.repulsion / (distance * distance);
                
                // Increase repulsion if nodes are unconnected, but with smaller multiplier
                if (!this.isNodesConnected(node1.id, node2.id)) {
                    force *= 1.2;
                }
                
                // Reduced exponential repulsion when overlapping
                if (distance < minDistance) {
                    force *= Math.exp((minDistance - distance) / 20);
                }

                // Cap the maximum force
                const maxForce = this.simulation.repulsion * 2;
                force = Math.min(force, maxForce);

                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                node1.vx -= fx;
                node1.vy -= fy;
                node2.vx += fx;
                node2.vy += fy;
            }
        }

        // Apply spring forces
        for (const edge of this.edges) {
            const source = this.nodes.get(edge.source);
            const target = this.nodes.get(edge.target);
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) - 50 || 1;
            
            // Reduce spring strength for nodes with different labels
            let springStrength = this.simulation.springStrength;
            if (source.label !== target.label) {
                springStrength *= 0.02; // Reduce to 2% for different labels
            }
            
            const force = (distance - this.simulation.springLength) * springStrength;
            
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
        }

        // Update positions with boundary constraints and damping
        for (const node of this.nodes.values()) {
            // Apply damping
            node.vx *= this.simulation.damping;
            node.vy *= this.simulation.damping;

            // Update position
            const dx = node.vx || 0;
            const dy = node.vy || 0;
            node.x += dx;
            node.y += dy;

            // Track movement
            totalMovement += Math.abs(dx) + Math.abs(dy);

            // Constrain to boundaries
            node.x = Math.max(this.boundaries.left + node.radius, 
                      Math.min(this.boundaries.right - node.radius, node.x));
            node.y = Math.max(this.boundaries.top + node.radius, 
                      Math.min(this.boundaries.bottom - node.radius, node.y));
        }

        // Only request update if there's significant movement
        if (totalMovement > this.simulation.stopThreshold) {
            this.calculateBoundaries();
            this.requestUpdate();
        }
    }

    updateTables() {
        // Update nodes table
        const nodesTable = document.querySelector('#nodes-table tbody');
        nodesTable.innerHTML = '';
        for (const node of this.nodes.values()) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${node.id}</td>
                <td>${node.label}</td>
            `;
            row.addEventListener('mouseenter', () => {
                this.highlightedNode = node.id;
                this.draw();
            });
            row.addEventListener('mouseleave', () => {
                this.highlightedNode = null;
                this.draw();
            });
            nodesTable.appendChild(row);
        }

        // Update edges table
        const edgesTable = document.querySelector('#edges-table tbody');
        edgesTable.innerHTML = '';
        for (const [index, edge] of this.edges.entries()) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${edge.source}</td>
                <td>${edge.target}</td>
                <td>${edge.label || ''}</td>
            `;
            row.addEventListener('mouseenter', () => {
                this.highlightedEdge = index;
                this.draw();
            });
            row.addEventListener('mouseleave', () => {
                this.highlightedEdge = null;
                this.draw();
            });
            edgesTable.appendChild(row);
        }
    }

    draw() {
        const now = Date.now();
        if (now - this.lastDrawTime < 1000 / this.frameRate) {
            this.requestUpdate();
            return;
        }
        this.lastDrawTime = now;

        // Clear canvas with a light gray background
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transformations
        this.ctx.save();
        this.ctx.translate(this.translateX, this.translateY);
        this.ctx.scale(this.scale, this.scale);

        // Draw edges with gradient
        for (const [index, edge] of this.edges.entries()) {
            const source = this.nodes.get(edge.source);
            const target = this.nodes.get(edge.target);
            
            if (source && target) {
                const isHighlighted = index === this.highlightedEdge ||
                    this.highlightedNode === edge.source ||
                    this.highlightedNode === edge.target;
                
                // Create gradient for edge
                const gradient = this.ctx.createLinearGradient(source.x, source.y, target.x, target.y);
                gradient.addColorStop(0, isHighlighted ? '#4CAF50' : '#bcbcbc');
                gradient.addColorStop(1, isHighlighted ? '#81C784' : '#dedede');

                // Draw edge with gradient
                this.ctx.beginPath();
                this.ctx.moveTo(source.x, source.y);
                this.ctx.lineTo(target.x, target.y);
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = (isHighlighted ? 3 : 2) / this.scale;
                this.ctx.stroke();

                // Draw fancy arrow
                const angle = Math.atan2(target.y - source.y, target.x - source.x);
                const arrowLength = 15 / this.scale;
                const arrowX = target.x - (target.radius + 5) * Math.cos(angle);
                const arrowY = target.y - (target.radius + 5) * Math.sin(angle);

                this.ctx.beginPath();
                this.ctx.moveTo(arrowX, arrowY);
                this.ctx.lineTo(
                    arrowX - arrowLength * Math.cos(angle - Math.PI/6),
                    arrowY - arrowLength * Math.sin(angle - Math.PI/6)
                );
                this.ctx.lineTo(
                    arrowX - arrowLength * Math.cos(angle + Math.PI/6),
                    arrowY - arrowLength * Math.sin(angle + Math.PI/6)
                );
                this.ctx.closePath();
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                // Enhanced edge labels
                if (edge.label) {
                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;
                    
                    this.ctx.font = `${10 / this.scale}px Arial`; // Reduced from 14px
                    const metrics = this.ctx.measureText(edge.label);
                    const labelPadding = 4 / this.scale; // Reduced from 6px
                    
                    // Draw label background with shadow
                    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                    this.ctx.shadowBlur = 4 / this.scale;
                    this.ctx.shadowOffsetX = 2 / this.scale;
                    this.ctx.shadowOffsetY = 2 / this.scale;
                    
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    const labelBg = {
                        x: midX - metrics.width/2 - labelPadding,
                        y: midY - 10 / this.scale - labelPadding,
                        w: metrics.width + 2*labelPadding,
                        h: 20 / this.scale + 2*labelPadding
                    };
                    this.roundRect(labelBg.x, labelBg.y, labelBg.w, labelBg.h, 4 / this.scale);
                    
                    // Reset shadow and draw text
                    this.ctx.shadowColor = 'transparent';
                    this.ctx.fillStyle = '#444';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(edge.label, midX, midY);
                }
            }
        }

        // Draw nodes with enhanced styling
        for (const node of this.nodes.values()) {
            const isHighlighted = node.id === this.highlightedNode;
            
            // Create gradient for node
            const gradient = this.ctx.createRadialGradient(
                node.x, node.y, 0,
                node.x, node.y, node.radius
            );
            gradient.addColorStop(0, isHighlighted ? '#E8F5E9' : '#ffffff');
            gradient.addColorStop(1, isHighlighted ? '#C8E6C9' : '#f5f5f5');

            // Draw node shadow
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = (isHighlighted ? 12 : 8) / this.scale;
            this.ctx.shadowOffsetX = 3 / this.scale;
            this.ctx.shadowOffsetY = 3 / this.scale;
            
            // Draw node body
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Draw node border
            this.ctx.strokeStyle = isHighlighted ? '#4CAF50' : '#9e9e9e';
            this.ctx.lineWidth = (isHighlighted ? 3 : 2) / this.scale;
            this.ctx.stroke();

            // Reset shadow for text
            this.ctx.shadowColor = 'transparent';
            
            // Draw node label with better styling
            this.ctx.fillStyle = '#000';
            this.ctx.font = `bold ${12 / this.scale}px Arial`; // Reduced from 16px
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.label, node.x, node.y - 4 / this.scale);
            
            this.ctx.font = `${9 / this.scale}px Arial`; // Reduced from 12px
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(`ID: ${node.id}`, node.x, node.y + 9 / this.scale); // Adjusted y-offset
        }

        // Draw label centers
        for (const [label, center] of this.labelCenters) {
            // Draw center point
            this.ctx.beginPath();
            this.ctx.arc(center.x, center.y, 5 / this.scale, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1 / this.scale;
            this.ctx.stroke();

            // Draw label text above point
            this.ctx.font = `${10 / this.scale}px Arial`;
            this.ctx.fillStyle = '#000';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${label} center`, center.x, center.y - 10 / this.scale);
        }

        this.ctx.restore();
    }

    // Add helper method for rounded rectangles
    roundRect(x, y, w, h, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.arcTo(x + w, y, x + w, y + h, radius);
        this.ctx.arcTo(x + w, y + h, x, y + h, radius);
        this.ctx.arcTo(x, y + h, x, y, radius);
        this.ctx.arcTo(x, y, x + w, y, radius);
        this.ctx.closePath();
        this.ctx.fill();
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = type;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 3000);
    }

    saveGraph() {
        try {
            const data = {
                nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
                    id,
                    label: node.label,
                    x: node.x,
                    y: node.y
                })),
                edges: this.edges
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'graph-data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Graph saved successfully!');
        } catch (error) {
            console.error('Error saving graph:', error);
            this.showNotification('Error saving graph', 'error');
        }
    }

    loadGraph(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Clear existing data
                this.clear();
                
                // Load nodes
                data.nodes.forEach(node => {
                    this.addNode(node.id, node.label);
                    const addedNode = this.nodes.get(node.id);
                    
                    // Only set position if provided in the data
                    if (typeof node.x === 'number' && typeof node.y === 'number') {
                        addedNode.x = node.x;
                        addedNode.y = node.y;
                    }
                    // Otherwise, position will be set by force-directed layout
                });
                
                // Load edges
                data.edges.forEach(edge => {
                    this.addEdge(edge.source, edge.target, edge.label);
                });
                
                this.draw();
                this.showNotification('Graph loaded successfully!');
            } catch (error) {
                console.error('Error loading graph:', error);
                this.showNotification('Error loading graph. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file);
    }

    exportImage() {
        // Create a temporary canvas with white background
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;

        // Draw white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Copy the current canvas content
        tempCtx.drawImage(this.canvas, 0, 0);

        // Convert to image and download
        try {
            const image = tempCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = image;
            a.download = 'graph-visualization.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            this.showNotification('Image exported successfully!');
        } catch (error) {
            console.error('Error exporting image:', error);
            this.showNotification('Error exporting image', 'error');
        }
    }

    searchGraph(query) {
        if (!query) {
            // Show all rows if query is empty
            document.querySelectorAll('#nodes-table tbody tr, #edges-table tbody tr').forEach(row => {
                row.classList.remove('hidden', 'highlight');
            });
            return;
        }

        query = query.toLowerCase();

        // Search nodes
        document.querySelectorAll('#nodes-table tbody tr').forEach(row => {
            const text = row.textContent.toLowerCase();
            const match = text.includes(query);
            row.classList.toggle('hidden', !match);
            row.classList.toggle('highlight', match);
        });

        // Search edges
        document.querySelectorAll('#edges-table tbody tr').forEach(row => {
            const text = row.textContent.toLowerCase();
            const match = text.includes(query);
            row.classList.toggle('hidden', !match);
            row.classList.toggle('highlight', match);

            // Also highlight connected nodes
            if (match) {
                const sourceId = row.cells[0].textContent;
                const targetId = row.cells[1].textContent;
                document.querySelectorAll('#nodes-table tbody tr').forEach(nodeRow => {
                    const nodeId = nodeRow.cells[0].textContent;
                    if (nodeId === sourceId || nodeId === targetId) {
                        nodeRow.classList.remove('hidden');
                        nodeRow.classList.add('highlight');
                    }
                });
            }
        });
    }
}
