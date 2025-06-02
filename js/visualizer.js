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
            damping: 0.9
        };
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
        this.highlightedNode = null;
        this.highlightedEdge = null;

        this.initCanvas();
        this.setupEventListeners();
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

    addNode(id, label) {
        id = `${id}`
        const x = Math.random() * (this.canvas.width - 100) + 50;
        const y = Math.random() * (this.canvas.height - 100) + 50;
        
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
        this.nodes.clear();
        this.edges = [];
        this.updateTables();
        this.draw();
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
            this.draw();
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

        // Calculate zoom
        const zoom = e.deltaY < 0 ? 1.1 : 0.9;
        
        // Adjust scale
        this.scale *= zoom;
        
        // Limit scale
        this.scale = Math.min(Math.max(0.1, this.scale), 5);
        
        // Adjust translation to zoom toward mouse position
        this.translateX = mouseX - (mouseX - this.translateX) * zoom;
        this.translateY = mouseY - (mouseY - this.translateY) * zoom;
        
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
            this.draw();
        }
    }

    handlePanEnd() {
        this.isPanning = false;
    }

    applyForces() {
        if (this.dragging) return; // Don't apply forces while dragging

        const nodeArray = Array.from(this.nodes.values());
        
        // Apply forces between all pairs of nodes
        for (let i = 0; i < nodeArray.length; i++) {
            const node1 = nodeArray[i];
            node1.vx = (node1.vx || 0) * this.simulation.damping;
            node1.vy = (node1.vy || 0) * this.simulation.damping;

            // Repulsion between nodes
            for (let j = i + 1; j < nodeArray.length; j++) {
                const node2 = nodeArray[j];
                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = this.simulation.repulsion / (distance * distance);
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                node1.vx = (node1.vx || 0) - fx;
                node1.vy = (node1.vy || 0) - fy;
                node2.vx = (node2.vx || 0) + fx;
                node2.vy = (node2.vy || 0) + fy;
            }
        }

        // Apply spring forces along edges
        for (const edge of this.edges) {
            const source = this.nodes.get(edge.source);
            const target = this.nodes.get(edge.target);
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (distance - this.simulation.springLength) * this.simulation.springStrength;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            source.vx = (source.vx || 0) + fx;
            source.vy = (source.vy || 0) + fy;
            target.vx = (target.vx || 0) - fx;
            target.vy = (target.vy || 0) - fy;
        }

        // Update positions
        for (const node of this.nodes.values()) {
            node.x += node.vx || 0;
            node.y += node.vy || 0;

            // Keep nodes within bounds
            node.x = Math.max(node.radius, Math.min(this.canvas.width - node.radius, node.x));
            node.y = Math.max(node.radius, Math.min(this.canvas.height - node.radius, node.y));
        }

        // Request next animation frame if there's still movement
        if (nodeArray.some(node => Math.abs(node.vx || 0) > 0.01 || Math.abs(node.vy || 0) > 0.01)) {
            requestAnimationFrame(() => {
                this.applyForces();
                this.draw();
            });
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
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transformations
        this.ctx.save();
        this.ctx.translate(this.translateX, this.translateY);
        this.ctx.scale(this.scale, this.scale);

        // Draw edges
        for (const [index, edge] of this.edges.entries()) {
            const source = this.nodes.get(edge.source);
            const target = this.nodes.get(edge.target);
            
            if (source && target) {
                // Set edge style based on highlight state
                const isHighlighted = index === this.highlightedEdge ||
                    this.highlightedNode === edge.source ||
                    this.highlightedNode === edge.target;
                
                // Draw edge line
                this.ctx.beginPath();
                this.ctx.moveTo(source.x, source.y);
                this.ctx.lineTo(target.x, target.y);
                this.ctx.strokeStyle = isHighlighted ? '#4CAF50' : '#999';
                this.ctx.lineWidth = isHighlighted ? 3 : 2;
                this.ctx.stroke();

                // Draw arrow
                const angle = Math.atan2(target.y - source.y, target.x - source.x);
                const arrowLength = 15;
                const arrowWidth = 8;
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
                this.ctx.fillStyle = '#999';
                this.ctx.fill();

                // Draw edge label with background
                if (edge.label) {
                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;
                    
                    // Add background to label
                    this.ctx.font = '14px Arial';
                    const metrics = this.ctx.measureText(edge.label);
                    const labelPadding = 4;
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    this.ctx.fillRect(
                        midX - metrics.width/2 - labelPadding,
                        midY - 20 - labelPadding,
                        metrics.width + 2*labelPadding,
                        20 + 2*labelPadding
                    );
                    
                    // Draw label text
                    this.ctx.fillStyle = '#666';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'bottom';
                    this.ctx.fillText(edge.label, midX, midY);
                }
            }
        }

        // Draw nodes
        for (const node of this.nodes.values()) {
            const isHighlighted = node.id === this.highlightedNode;
            
            // Draw node circle with shadow
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = isHighlighted ? 10 : 5;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
            
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = isHighlighted ? '#e8f5e9' : '#fff';
            this.ctx.fill();
            this.ctx.strokeStyle = isHighlighted ? '#4CAF50' : '#333';
            this.ctx.lineWidth = isHighlighted ? 3 : 2;
            this.ctx.stroke();

            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            
            // Draw node label
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.label, node.x, node.y);
            
            // Draw node ID (smaller, below the label)
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(`ID: ${node.id}`, node.x, node.y + 15);
        }

        this.ctx.restore();
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

    // ...existing code...
}
