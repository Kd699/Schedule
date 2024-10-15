const TimeDistributionTool = () => {
    const now = new Date();
    const [startDateTime, setStartDateTime] = React.useState(new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16));
    const [endDateTime, setEndDateTime] = React.useState(new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16));
    const [totalTime, setTotalTime] = React.useState({ days: 0, hours: 0, minutes: 0 });
    const [events, setEvents] = React.useState([
        { name: 'Work', duration: 0, color: '#FF6B6B' },
        { name: 'Freshen up', duration: 0, color: '#4ECDC4' },
        { name: 'Meditate', duration: 0, color: '#45B7D1' },
        { name: 'Buffer', duration: 0, color: '#FFA07A' }
    ]);
    const [newEventName, setNewEventName] = React.useState('');
    const [deletedEvents, setDeletedEvents] = React.useState([]);
    const [tubularInput, setTubularInput] = React.useState('');
    const tableRef = React.useRef(null);
    const [tooltipVisible, setTooltipVisible] = React.useState(Array(events.length).fill(false));

    React.useEffect(() => {
        const { totalMinutes, formattedTime } = calculateTotalTime(startDateTime, endDateTime);
        setTotalTime(formattedTime);
        updateChart(events, totalMinutes);
    }, [startDateTime, endDateTime, events]);

    const handleSubmit = () => {
        if (tubularInput) {
            parseTubularData(tubularInput);
        }
    };

    const parseTubularData = (data) => {
        const rows = data.trim().split('\n');
        const parsedEvents = rows.map((row) => {
            const [date, task, duration, startTime, endTime] = row.split('\t');
            return {
                name: task,
                duration: parseDuration(duration),
                startTime,
                endTime,
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
            };
        });
        setEvents(parsedEvents);
    };

    const parseDuration = (durationString) => {
        const parts = durationString.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        return hours * 60 + minutes;
    };

    const handleNowButton = (setter) => {
        const now = new Date();
        const formattedNow = now.toISOString().slice(0, 16);
        setter(formattedNow);
    };

    const handleDurationChange = (index, newDuration) => {
        const newEvents = [...events];
        newEvents[index].duration = parseInt(newDuration);
        setEvents(newEvents);
    };

    const adjustOtherTasks = (newEvents, changedIndex) => {
        const totalMinutes = calculateTotalTime(startDateTime, endDateTime).totalMinutes;
        const totalCurrentDuration = newEvents.reduce((sum, event) => sum + event.duration, 0);
        const difference = totalMinutes - totalCurrentDuration;

        if (difference !== 0) {
            const otherEvents = newEvents.filter((_, i) => i !== changedIndex);
            const totalOtherDuration = otherEvents.reduce((sum, event) => sum + event.duration, 0);

            otherEvents.forEach((event, i) => {
                if (i !== changedIndex) {
                    const proportion = event.duration / totalOtherDuration;
                    event.duration += Math.round(difference * proportion);
                }
            });
        }

        const finalTotal = newEvents.reduce((sum, event) => sum + event.duration, 0);
        if (finalTotal !== totalMinutes) {
            const diff = totalMinutes - finalTotal;
            newEvents[newEvents.length - 1].duration += diff;
        }
    };

    const distributeTimeEqually = () => {
        const totalMinutes = calculateTotalTime(startDateTime, endDateTime).totalMinutes;
        const unlockedEvents = events.filter(event => !event.locked);
        const remainingTime = totalMinutes - events.filter(event => event.locked).reduce((sum, event) => sum + event.duration, 0);

        if (remainingTime <= 0) {
            alert("No time left to distribute among unlocked tasks!");
            return;
        }

        const equalShare = Math.floor(remainingTime / unlockedEvents.length);
        const newEvents = events.map(event => {
            if (event.locked) return event;
            return { ...event, duration: equalShare };
        });

        setEvents(newEvents);
    };

    const distributeTimeProportionally = () => {
        const totalMinutes = calculateTotalTime(startDateTime, endDateTime).totalMinutes;
        const unlockedEvents = events.filter(event => !event.locked);
        const lockedTime = events.filter(event => event.locked).reduce((sum, event) => sum + event.duration, 0);
        const remainingTime = totalMinutes - lockedTime;

        if (remainingTime <= 0) {
            alert("No time left to distribute among unlocked tasks!");
            return;
        }

        const totalUnlockedTime = unlockedEvents.reduce((sum, event) => sum + event.duration, 0);

        if (totalUnlockedTime === 0) {
            distributeTimeEqually();
            return;
        }

        const newEvents = events.map(event => {
            if (event.locked) return event;
            const proportion = event.duration / totalUnlockedTime;
            return { ...event, duration: Math.round(remainingTime * proportion) };
        });

        const finalTotal = newEvents.reduce((sum, event) => sum + event.duration, 0);
        const diff = totalMinutes - finalTotal;
        const lastUnlockedIndex = newEvents.map(e => !e.locked).lastIndexOf(true);
        if (lastUnlockedIndex !== -1) {
            newEvents[lastUnlockedIndex].duration += diff;
        }

        setEvents(newEvents);
    };

    const areTasksEquallyDistributed = () => {
        const unlockedEvents = events.filter(event => !event.locked);
        if (unlockedEvents.length <= 1) return true;
        const firstDuration = unlockedEvents[0].duration;
        return unlockedEvents.every(event => event.duration === firstDuration);
    };

    const toggleLock = (index) => {
        const newEvents = [...events];
        newEvents[index].locked = !newEvents[index].locked;
        setEvents(newEvents);
    };

    const addNewEvent = () => {
        if (newEventName) {
            setEvents([...events, { 
                name: newEventName, 
                duration: 0, 
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`
            }]);
            setNewEventName('');
        }
    };

    const deleteEvent = (index) => {
        const eventToDelete = events[index];
        setDeletedEvents([...deletedEvents, eventToDelete]);
        const newEvents = events.filter((_, i) => i !== index);
        adjustOtherTasks(newEvents, -1);
        setEvents(newEvents);
    };

    const undoDelete = () => {
        const lastDeleted = deletedEvents.pop();
        if (lastDeleted) {
            const newEvents = [...events, lastDeleted];
            adjustOtherTasks(newEvents, newEvents.length - 1);
            setEvents(newEvents);
            setDeletedEvents([...deletedEvents]);
        }
    };

    const reorderEvents = (index, direction) => {
        const newEvents = [...events];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < events.length) {
            [newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]];
            setEvents(newEvents);
        }
    };

    const copyTableToClipboard = () => {
        if (tableRef.current) {
            const rows = tableRef.current.querySelectorAll('tbody tr');
            let clipboardText = '';

            rows.forEach((row) => {
                const columns = row.querySelectorAll('td');
                const date = columns[0].textContent;
                const task = columns[1].textContent;
                const duration = formatDuration(columns[2].querySelector('span').textContent);
                const startTime = columns[3].textContent;
                const endTime = columns[4].textContent;

                clipboardText += `${date}\t${task}\t${duration}\t${startTime}\t${endTime}\n`;
            });

            navigator.clipboard.writeText(clipboardText.trim())
                .then(() => alert('Table copied to clipboard!'))
                .catch((err) => console.error('Failed to copy table: ', err));
        }
    };

    const formatDuration = (duration) => {
        const minutes = parseInt(duration);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:00`;
    };

    const handleDurationChangeInTable = (index, newDuration) => {
        const newEvents = [...events];
        newEvents[index].duration = parseInt(newDuration);
        setEvents(newEvents);
    };

    const toggleLockInTable = (index) => {
        const newEvents = [...events];
        newEvents[index].locked = !newEvents[index].locked;
        setEvents(newEvents);
    };

    const reorderEventsInTable = (index, direction) => {
        const newEvents = [...events];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newEvents.length) {
            [newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]];
            setEvents(newEvents);
        }
    };

    const deleteEventInTable = (index) => {
        const eventToDelete = events[index];
        setDeletedEvents([...deletedEvents, eventToDelete]);
        const newEvents = events.filter((_, i) => i !== index);
        adjustOtherTasks(newEvents, -1);
        setEvents(newEvents);
    };

    const fullLock = (index) => {
        const newEvents = [...events];
        newEvents[index].fullLocked = !newEvents[index].fullLocked;
        setEvents(newEvents);
    };

    const lockDuration = (index) => {
        const newEvents = [...events];
        newEvents[index].durationLocked = !newEvents[index].durationLocked;
        setEvents(newEvents);
    };

    // Tooltip component
    const Tooltip = ({ children, isVisible }) => (
        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white p-2 rounded shadow-lg transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {children}
        </div>
    );

    return (
        <div className="container mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Enhanced Time Distribution Tool</h1>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Enter Tubular Data:</label>
                <textarea
                    value={tubularInput}
                    onChange={(e) => setTubularInput(e.target.value)}
                    placeholder="Paste tubular data here..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm h-32"
                />
                <button
                    onClick={handleSubmit}
                    className="mt-2 bg-blue-500 text-white p-2 rounded"
                >
                    Submit Tubular Data
                </button>
            </div>
    
            <div className="mb-4 flex justify-between">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date/Time:</label>
                    <div className="flex items-center">
                        <input 
                            type="datetime-local" 
                            value={startDateTime} 
                            onChange={(e) => setStartDateTime(e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
                        />
                        <button 
                            onClick={() => handleNowButton(setStartDateTime)} 
                            className="ml-2 bg-blue-500 text-white p-2 rounded"
                        >
                            Now
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">End Date/Time:</label>
                    <div className="flex items-center">
                        <input 
                            type="datetime-local" 
                            value={endDateTime} 
                            onChange={(e) => setEndDateTime(e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
                        />
                        <button 
                            onClick={() => handleNowButton(setEndDateTime)} 
                            className="ml-2 bg-blue-500 text-white p-2 rounded"
                        >
                            Now
                        </button>
                    </div>
                </div>
            </div>
    
            <div className="flex justify-center mb-8">
                <svg id="chart"></svg>
            </div>
    
            <div className="mb-4 flex justify-between items-center">
                <div>
                    <input 
                        type="text" 
                        value={newEventName} 
                        onChange={(e) => setNewEventName(e.target.value)} 
                        placeholder="New event name" 
                        className="mr-2 p-2 border rounded"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                addNewEvent();
                            }
                        }}
                    />
                    <button onClick={addNewEvent} className="bg-blue-500 text-white p-2 rounded">Add Event</button>
                    <button onClick={undoDelete} className="bg-gray-500 text-white p-2 rounded ml-2">Undo Delete</button>
                </div>
                <div>
                    <button 
                        onClick={distributeTimeEqually} 
                        className="bg-green-500 text-white p-2 rounded mr-2"
                        disabled={areTasksEquallyDistributed()}
                    >
                        Distribute Equally
                    </button>
                    <button 
                        onClick={distributeTimeProportionally} 
                        className="bg-yellow-500 text-white p-2 rounded"
                    >
                        Distribute Proportionally
                    </button>
                </div>
            </div>
    
            <p className="mt-8 text-center text-lg font-semibold text-gray-700">
                Total time: {totalTime.days} days, {totalTime.hours} hours, {totalTime.minutes} minutes
            </p>
    
            <div className="mt-8 relative">
                <h2 className="text-2xl font-bold mb-4">Interactive Time Table</h2>
                <table className="min-w-full bg-white" ref={tableRef}>
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b">Date</th>
                            <th className="py-2 px-4 border-b">Task</th>
                            <th className="py-2 px-4 border-b">Duration</th>
                            <th className="py-2 px-4 border-b">Start Time</th>
                            <th className="py-2 px-4 border-b">End Time</th>
                            <th className="py-2 px-4 border-b">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {generateTimeTable(events, startDateTime).map((row, index) => (
                            <tr key={index}>
                                <td className="py-2 px-4 border-b">{row.date}</td>
                                <td className="py-2 px-4 border-b">{row.task}</td>
                                <td className="py-2 px-4 border-b">
                                    <input
                                        type="range"
                                        min="0"
                                        max={totalTime.days * 24 * 60 + totalTime.hours * 60 + totalTime.minutes}
                                        value={events[index].duration}
                                        onChange={(e) => handleDurationChangeInTable(index, e.target.value)}
                                        disabled={events[index].locked}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span>{events[index].duration} minutes</span>
                                </td>
                                <td className="py-2 px-4 border-b">{row.startTime}</td>
                                <td className="py-2 px-4 border-b">{row.endTime}</td>
                                <td className="py-2 px-4 border-b">
                                    <div className="flex space-x-2">
                                        <div className="relative">
                                            <button
                                                onMouseEnter={() => {
                                                    const newTooltipVisible = [...tooltipVisible];
                                                    newTooltipVisible[index] = true;
                                                    setTooltipVisible(newTooltipVisible);
                                                }}
                                                onMouseLeave={() => {
                                                    const newTooltipVisible = [...tooltipVisible];
                                                    newTooltipVisible[index] = false;
                                                    setTooltipVisible(newTooltipVisible);
                                                }}
                                                onClick={() => toggleLockInTable(index)}
                                                className={`p-1 rounded ${events[index].locked ? 'bg-red-500' : 'bg-green-500'} text-white text-xs`}
                                            >
                                                {events[index].locked ? 'Unlock' : 'Lock'}
                                            </button>
                                            <Tooltip isVisible={tooltipVisible[index]}>
                                                <button onClick={() => fullLock(index)} className="block w-full text-left p-1 hover:bg-gray-700">
                                                    Full Lock
                                                </button>
                                                <button onClick={() => lockDuration(index)} className="block w-full text-left p-1 hover:bg-gray-700">
                                                    Lock Duration
                                                </button>
                                            </Tooltip>
                                        </div>
                                        <button
                                            onClick={() => reorderEventsInTable(index, 'up')}
                                            className="bg-green-500 text-white p-1 rounded text-xs"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => reorderEventsInTable(index, 'down')}
                                            className="bg-yellow-500 text-white p-1 rounded text-xs"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            onClick={() => deleteEventInTable(index)}
                                            className="bg-red-500 text-white p-1 rounded text-xs"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                onClick={copyTableToClipboard}
                className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded shadow-lg hover:bg-blue-600 transition-colors"
            >
                Copy Table
            </button>
        </div>
    );
};
