/**
 * raas_topology.js
 *
 * This JavaScript module manages the rendering and UI interactivity for network topology data
 * within the RaaS Client web application.
 *
 * Features:
 * - Processes raw topology edge data provided by the backend template (window.raas_topology_data).
 * - Infers node roles (switch/host) for use in D3-based topology visualization.
 * - Renders a D3 force-directed graph of the network topology.
 * - Pretty-prints topology edges as syntax-highlighted JSON using Prism.js.
 * - Ensures the topology graph dynamically resizes with its container.
 *
 * Dependencies:
 * - D3.js (for graph rendering)
 * - Prism.js (for JSON syntax highlighting)
 * - Relies on a globally available `renderTopologyGraph()` function (typically from topology_graph.js).
 *
 * Usage:
 * Include <script src="/static/raas_topology.js"></script> in your HTML after D3, Prism, and graph utility scripts.
 */


window.addEventListener("DOMContentLoaded", function () {
    // Only run if we have topology data
    if (!window.raas_topology_data) return;

    const edges = window.raas_topology_data.edges || [];
    const d3Edges = edges.filter(e => e.source && e.target);

    // Node detection and typing (switch/host)
    const nodeMap = {};
    d3Edges.forEach(e => {
        [e.source, e.target].forEach(n => {
            if (!(n in nodeMap)) {
                nodeMap[n] = {
                    id: n,
                    type: n.startsWith("openflow:") ? "switch" : "host"
                };
            }
        });
    });
    const nodes = Object.values(nodeMap);

    // Minimal JSON for pretty print
    const edgesMinimal = d3Edges.map(e => ({
        source: e.source,
        target: e.target,
        cost: e.cost
    }));
    const jsonPre = document.getElementById('json-highlight');
    if (jsonPre) {
        jsonPre.textContent = JSON.stringify(edgesMinimal, null, 2);
        if (window.Prism) Prism.highlightElement(jsonPre);
    }

    // Render the D3 graph
    function render() {
        if (typeof renderTopologyGraph === 'function') {
            renderTopologyGraph(d3Edges, nodes);
        }
    }
    render();

    // Responsive: re-render on container resize
    let ro = new ResizeObserver(() => { render(); });
    ro.observe(document.getElementById('graph'));
});
