function calculateTotalTime(startDateTime, endDateTime) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diffMilliseconds = end - start;
    const totalMinutes = diffMilliseconds / 60000;

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = Math.floor(totalMinutes % 60);

    return {
        totalMinutes,
        formattedTime: { days, hours, minutes }
    };
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

function formatDateTime(dateTimeString) {
    const dateTime = new Date(dateTimeString);
    return dateTime.toLocaleString();
}

function generateTimeTable(events, startDateTime) {
    let currentTime = new Date(startDateTime);
    return events.map(event => {
        const startTimeStr = currentTime.toLocaleString();
        currentTime = new Date(currentTime.getTime() + event.duration * 60000);
        const endTimeStr = currentTime.toLocaleString();
        return {
            date: currentTime.toLocaleDateString(),
            task: event.name,
            duration: `${Math.floor(event.duration / 60)}:${(event.duration % 60).toString().padStart(2, '0')}:00`,
            startTime: startTimeStr,
            endTime: endTimeStr
        };
    });
}
