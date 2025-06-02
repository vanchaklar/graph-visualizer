# Graph Visualizer

An interactive web-based graph visualization tool that allows users to create, manipulate, and analyze directed graphs with labeled nodes and edges.

## Features

- Interactive graph visualization with drag-and-drop nodes
- Force-directed layout with adjustable parameters
- Add/remove nodes and edges with custom labels
- Save and load graph data as JSON
- Export graph visualization as PNG
- Search functionality for nodes and edges
- Pan and zoom controls
- Real-time table view of nodes and edges
- Highlight connections on hover

## Controls

- **Pan**: Middle mouse button or Alt + Left mouse button
- **Zoom**: Mouse wheel
- **Drag Nodes**: Left mouse button
- **Add Node**: Click "Add Node" button and enter label
- **Add Edge**: Click "Add Edge" button and enter source/target IDs and label

## Force-Directed Layout Controls

- Spring Length: Controls the ideal distance between connected nodes
- Spring Strength: Adjusts how strongly connected nodes attract each other
- Repulsion: Controls how strongly nodes repel each other
- Damping: Adjusts how quickly node movement stabilizes

## Installation

1. Clone this repository:
```bash
git clone https://github.com/vanchaklar/graph-visualizer.git
cd graph-visualizer
```

2. Open `index.html` in a modern web browser.

## File Structure

```
/
├── index.html          # Main HTML file
├── css/
│   └── styles.css     # Stylesheet
└── js/
    └── visualizer.js  # Graph visualization logic
```

## Dependencies

No external dependencies required! The visualizer is built with vanilla JavaScript, HTML5 Canvas, and CSS.

## License

feel free to use this project for personal or commercial purposes.
