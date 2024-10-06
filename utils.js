function calculateTotalMinutes(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-02T${endTime}`);
    return (end - start) / 60000;
}

function updateChart(events, totalMinutes) {
    d3.select('#chart').selectAll('*').remove();

    const svg = d3.select('#chart')
        .attr('width', 400)
        .attr('height', 400)
        .append('g')
        .attr('transform', 'translate(200,200)');

    const pie = d3.pie().value(d => d.duration).sort(null);
    const arc = d3.arc().innerRadius(100).outerRadius(200);

    const arcs = svg.selectAll('arc')
        .data(pie(events))
        .enter()
        .append('g');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => d.data.color)
        .attr('stroke', 'white')
        .style('stroke-width', '2px')
        .style('opacity', 0.7);

    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', 'white')
        .text(d => `${Math.round(d.data.duration / totalMinutes * 100)}%`);
}

function formatDateTime(timeString) {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = timeString + ':00';
    return `${date} ${time}`;
}

function generateTimeTable(events, startTime) {
    let currentTime = new Date(`2000-01-01T${startTime}`);
    return events.map(event => {
        const startTimeStr = currentTime.toTimeString().slice(0, 8);
        currentTime = new Date(currentTime.getTime() + event.duration * 60000);
        const endTimeStr = currentTime.toTimeString().slice(0, 8);
        return {
            date: new Date().toLocaleDateString(),
            task: event.name,
            duration: `${Math.floor(event.duration / 60)}:${(event.duration % 60).toString().padStart(2, '0')}:00`,
            startTime: formatDateTime(startTimeStr),
            endTime: formatDateTime(endTimeStr)
        };
    });
}
