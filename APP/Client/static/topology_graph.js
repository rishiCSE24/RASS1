function renderTopologyGraph(edges, nodes) {
    d3.select("#graph").select("svg").remove();
    const container = document.getElementById("graph");
    const width = container.clientWidth;
    const height = container.clientHeight;

    const zoom = d3.zoom().scaleExtent([0.2, 5]);

    const svg = d3.select("#graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom.on("zoom", function (event) {
            g.attr("transform", event.transform);
        }));

    const g = svg.append("g");

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(edges).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = g.append("g")
        .selectAll("line")
        .data(edges)
        .enter()
        .append("line")
        .attr("stroke", "#999")
        .attr("stroke-width", 2);

    // Draw nodes by type
    // Circles for hosts, squares for switches
    const hostNodes = nodes.filter(n => n.type === "host");
    const switchNodes = nodes.filter(n => n.type === "switch");

    // Draw switch nodes as squares
    const switchSel = g.append("g")
        .selectAll("rect")
        .data(switchNodes)
        .enter()
        .append("rect")
        .attr("width", 34)
        .attr("height", 34)
        .attr("fill", "red")
        .attr("stroke", "#222")
        .attr("stroke-width", 2)
        .attr("rx", 6) // rounded corners

    // Draw host nodes as circles
    const hostSel = g.append("g")
        .selectAll("circle")
        .data(hostNodes)
        .enter()
        .append("circle")
        .attr("r", 18)
        .attr("fill", "#2879d0")
        .attr("stroke", "#222")
        .attr("stroke-width", 2);

    // Add labels for all nodes, in black
    const label = g.append("g")
        .selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .text(d => d.id)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("dy", 4)
        .attr("fill", "#000")
        .style("pointer-events", "none");

    simulation.on("tick", () => {
        // Edges
        link
            .attr("x1", d => getNodePos(d.source, "x"))
            .attr("y1", d => getNodePos(d.source, "y"))
            .attr("x2", d => getNodePos(d.target, "x"))
            .attr("y2", d => getNodePos(d.target, "y"));

        // Switches (squares)
        switchSel
            .attr("x", d => d.x - 17)
            .attr("y", d => d.y - 17);

        // Hosts (circles)
        hostSel
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        // Labels (all nodes)
        label
            .attr("x", d => d.x)
            .attr("y", d => d.y + 32); // move label below node
    });

    // Helper to get node x/y for given id
    function getNodePos(id, coord) {
        const n = nodes.find(n => n.id === (typeof id === "object" ? id.id : id));
        return n ? n[coord] : 0;
    }
}
