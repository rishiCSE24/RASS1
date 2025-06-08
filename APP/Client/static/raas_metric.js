/**
 * raas_metric.js
 *
 * This JavaScript module provides dynamic UI logic for the Metric Formulation and Path Algorithm
 * section of the RaaS Client web application.
 *
 * Features:
 * - Dynamically generates input fields for custom metric attributes and their corresponding weights.
 * - Validates that the sum of all weights equals 1; auto-resets weights if constraint is violated.
 * - Presents a dropdown menu for selecting NetworkX-compatible shortest path algorithms.
 * - Handles metric form submission for further integration with backend API (e.g., AJAX POST).
 *
 * Intended to be included in pages where metric-based path computation is supported.
 *
 * Dependencies:
 * - None (uses only vanilla JS and standard DOM API).
 *
 * Usage:
 * Include <script src="/static/raas_metric.js"></script> in your HTML after rendering the metric section.
 */

window.addEventListener('DOMContentLoaded', function () {
    let metricSection = document.getElementById('metric-section');
    if (metricSection) {
        metricSection.style.display = 'block';
    }
});

window.setupWeights = function () {
    let attrStr = document.getElementById("attributes").value.trim();
    let attrs = attrStr ? attrStr.split(",").map(s => s.trim()).filter(Boolean) : [];
    let N = attrs.length;
    let weightsSection = document.getElementById("weights-section");
    weightsSection.innerHTML = "";
    document.getElementById("weight-warning").style.display = "none";
    if (N === 0) return;
    for(let i=0; i<N; i++) {
        let label = document.createElement("label");
        label.innerText = attrs[i] + ": ";
        let input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "1";
        input.step = "0.01";
        input.value = (1/N).toFixed(2);
        input.style.width = "50px";
        input.className = "weight-input";
        input.name = "weight_" + attrs[i];
        input.onchange = validateWeights;
        label.appendChild(input);
        weightsSection.appendChild(label);
        weightsSection.appendChild(document.createElement("br"));
    }
}

window.validateWeights = function () {
    let inputs = document.querySelectorAll(".weight-input");
    let sum = 0;
    inputs.forEach(inp => sum += parseFloat(inp.value || 0));
    if (Math.abs(sum - 1) > 0.001) {
        let N = inputs.length;
        inputs.forEach(inp => inp.value = (1/N).toFixed(2));
        document.getElementById("weight-warning").style.display = "block";
    } else {
        document.getElementById("weight-warning").style.display = "none";
    }
}

window.handleMetricSubmit = async function () {
    // Collect metric info
    let attrStr = document.getElementById("attributes").value.trim();
    let attrs = attrStr ? attrStr.split(",").map(s => s.trim()).filter(Boolean) : [];
    let weights = {};
    document.querySelectorAll(".weight-input").forEach(inp => {
        let k = inp.name.replace("weight_", "");
        weights[k] = parseFloat(inp.value || 0);
    });
    let algo = document.getElementById("algo-select").value;

    // Collect topology info for server (as list of {source, target, weight})
    // This assumes your window.raas_topology_data.edges is [{source, target, cost}, ...]
    let edges = window.raas_topology_data.edges.map(e => ({
        source: e.source,
        target: e.target,
        weight: e.cost || 1
    }));

    // Package as required by server
    let payload = {
        metric: weights,
        topo: edges,
        algo: algo
    };

    // POST to server
    let pathResultDiv = document.getElementById("path-results");
    if (pathResultDiv) {
        pathResultDiv.innerHTML = "<em>Computing shortest paths...</em>";
    }
    try {
        let response = await fetch("http://localhost:8001/compute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        let result = await response.json();
        // Show formatted result
        if (pathResultDiv) {
            pathResultDiv.innerHTML = renderPaths(result);
        }
    } catch (e) {
        if (pathResultDiv) {
            pathResultDiv.innerHTML = `<span style="color:red;">Error: ${e}</span>`;
        }
    }
};

// Helper to pretty print server result
function renderPaths(res) {
    if (res.error) return `<span style="color:red;">Error: ${res.error}</span>`;
    let out = '';
    for (let key in res) {
        out += `<div><b>${key.replaceAll("_", " ⟶ ")}</b>:<br>`;
        if (Array.isArray(res[key])) {
            out += res[key].map(path =>
                `<span style="padding-left:1em;">${Array.isArray(path) ? path.join(" ⟶ ") : JSON.stringify(path)}</span>`
            ).join("<br>");
        } else {
            out += `<span style="padding-left:1em;">${JSON.stringify(res[key])}</span>`;
        }
        out += `</div><br>`;
    }
    return out || "<em>No paths found.</em>";
}
