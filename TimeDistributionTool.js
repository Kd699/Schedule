const TimeDistributionTool = () => {
    const [startDateTime, setStartDateTime] = React.useState(() => {
        const now = new Date();
        return now.toISOString();
    });
    const [endDateTime, setEndDateTime] = React.useState(() => {
        const now = new Date();
        now.setHours(now.getHours() + 1);
        return now.toISOString();
    });
    const [totalTime, setTotalTime] = React.useState({ days: 0, hours: 0, minutes: 0 });
    const [events, setEvents] = React.useState([
        { name: 'Work', duration: 0, color: '#FF6B6B' },
        { name: 'Freshen up', duration: 0, color: '#4ECDC4' },
        { name: 'Meditate', duration: 0, color: '#45B7D1' },
        { name: 'Buffer', duration: 0, color: '#FFA07A' }
    ]);
    const [newEventName, setNewEventName] = React.useState('');
    const [deletedEvents, setDeletedEvents] = React.useState([]);
    const [tubularInput, setTubularInput] = React.useState(''); // Text area input for tubular data

    React.useEffect(() => {
        if (events.length > 0) {
            const { totalMinutes, formattedTime } = calculateTotalTime(startDateTime, endDateTime);
            setTotalTime(formattedTime);
            updateChart(events, totalMinutes);
        }
    }, [startDateTime, endDateTime, events]);

    // Function to handle parsing the text area input when submit button is clicked
    const handleSubmit = () => {
        if (tubularInput) {
            parseTubularData(tubularInput);
        }
    };

    // Helper function to parse date string in DD/MM/YYYY format
    const parseDate = (dateString, timeString) => {
        const [day, month, year] = dateString.split('/');
        const [hours, minutes] = timeString.split(':');
        return new Date(year, month - 1, day, hours, minutes);
    };

    // Function to parse tubular data and update the events
    const parseTubularData = (data) => {
        const rows = data.trim().split('\n');
        let firstStartTime = null;
        let lastEndTime = null;
        const parsedEvents = rows.map((row) => {
            const [date, task, duration, startTimeStr, endTimeStr] = row.split('\t');
            const [startDate, startTime] = startTimeStr.split(', ');
            const [endDate, endTime] = endTimeStr.split(', ');
            
            const startDateTime = parseDate(startDate, startTime);
            const endDateTime = parseDate(endDate, endTime);
            
            if (!firstStartTime || startDateTime < firstStartTime) {
                firstStartTime = startDateTime;
            }
            if (!lastEndTime || endDateTime > lastEndTime) {
                lastEndTime = endDateTime;
            }

            return {
                name: task,
                duration: parseDuration(duration),
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
            };
        });
        
        // Update start and end times
        if (firstStartTime && lastEndTime) {
            setStartDateTime(firstStartTime.toISOString());
            setEndDateTime(lastEndTime.toISOString());
        }
        
        setEvents(parsedEvents);
    };

    // Function to convert HH:MM:SS format into total minutes
    const parseDuration = (durationString) => {
        const parts = durationString.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        return hours * 60 + minutes;
    };

    const handleNowButton = (setter) => {
        const now = new Date();
        setter(now.toISOString());
    };

    const handleDurationChange = (index, newDuration) => {
        const newEvents = [...events];
        newEvents[index].duration = Math.round(parseFloat(newDuration));
        adjustOtherTasks(newEvents, index);
        setEvents(newEvents);
    };

    const adjustOtherTasks = (newEvents, changedIndex) => {
        const totalMinutes = calculateTotalTime(startDateTime, endDateTime).totalMinutes;
        const totalCurrentDuration = newEvents.reduce((sum, event) => sum + event.duration, 0);
        const difference = totalMinutes - totalCurrentDuration;

        if (difference !== 0) {
            const adjustableEvents = newEvents.filter((event, i) => i !== changedIndex && !event.locked);
            const totalAdjustableDuration = adjustableEvents.reduce((sum, event) => sum + event.duration, 0);

            if (totalAdjustableDuration > 0) {
                adjustableEvents.forEach(event => {
                    const proportion = event.duration / totalAdjustableDuration;
                    event.duration += Math.round(difference * proportion);
                });
            } else {
                console.warn("No adjustable events found. Unable to distribute time difference.");
            }
        }

        // Ensure total is exactly 100%
        const finalTotal = newEvents.reduce((sum, event) => sum + event.duration, 0);
        if (finalTotal !== totalMinutes) {
            const diff = totalMinutes - finalTotal;
            const lastAdjustableIndex = newEvents.findLastIndex(event => !event.locked);
            if (lastAdjustableIndex !== -1) {
                newEvents[lastAdjustableIndex].duration += diff;
            } else {
                console.warn("No adjustable events found. Unable to correct final total.");
            }
        }
    };

    const distributeTimeEqually = () => {
        const totalMinutes = calculateTotalTime(startDateTime, endDateTime).totalMinutes;
        const unlockedEvents = events.filter(event => !event.locked);
        const lockedTime = events.filter(event => event.locked).reduce((sum, event) => sum + event.duration, 0);
        const remainingTime = totalMinutes - lockedTime;

        if (remainingTime <= 0) {
            alert("No time left to distribute among unlocked tasks!");
            return;
        }

        const equalShare = Math.floor(remainingTime / unlockedEvents.length);

        if (equalShare === 0) {
            alert("Not enough time to distribute equally among unlocked tasks!");
            return;
        }

        const newEvents = events.map(event => {
            if (event.locked) return event;
            return { ...event, duration: equalShare };
        });

        // Distribute any remaining minutes
        const distributedTime = equalShare * unlockedEvents.length;
        const leftoverMinutes = remainingTime - distributedTime;
        for (let i = 0; i < leftoverMinutes; i++) {
            const index = newEvents.findIndex((event, idx) => !event.locked && event.duration === equalShare);
            if (index !== -1) newEvents[index].duration += 1;
        }

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
            distributeTimeEqually(); // If all unlocked tasks have 0 duration, distribute equally
            return;
        }

        let distributedTime = 0;
        const newEvents = events.map(event => {
            if (event.locked) return event;
            const proportion = event.duration / totalUnlockedTime;
            const newDuration = Math.floor(remainingTime * proportion);
            distributedTime += newDuration;
            return { ...event, duration: newDuration };
        });

        // Distribute any remaining minutes
        const leftoverMinutes = remainingTime - distributedTime;
        for (let i = 0; i < leftoverMinutes; i++) {
            const index = newEvents.findIndex(event => !event.locked);
            if (index !== -1) newEvents[index].duration += 1;
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
            const temp = newEvents[targetIndex];
            newEvents[targetIndex] = newEvents[index];
            newEvents[index] = temp;
            setEvents(newEvents);
        }
    };

    const formatDateTimeForInput = (dateString) => {
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - userTimezoneOffset)).toISOString().slice(0, 16);
    };

    const formatDateTimeForDisplay = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <div className="container mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Enhanced Time Distribution Tool</h1>
            
                {/* Text Area for Tubular Data */}
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
                            value={formatDateTimeForInput(startDateTime)} 
                            onChange={(e) => setStartDateTime(new Date(e.target.value).toISOString())} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
                        />
                        <button 
                            onClick={() => handleNowButton(setStartDateTime)} 
                            className="ml-2 bg-blue-500 text-white p-2 rounded"
                        >
                            Now
                        </button>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        {formatDateTimeForDisplay(startDateTime)}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">End Date/Time:</label>
                    <div className="flex items-center">
                        <input 
                            type="datetime-local" 
                            value={formatDateTimeForInput(endDateTime)} 
                            onChange={(e) => setEndDateTime(new Date(e.target.value).toISOString())} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
                        />
                        <button 
                            onClick={() => handleNowButton(setEndDateTime)} 
                            className="ml-2 bg-blue-500 text-white p-2 rounded"
                        >
                            Now
                        </button>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        {formatDateTimeForDisplay(endDateTime)}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((item, index) => (
                    <div key={item.name} className="bg-white p-4 rounded-md shadow">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-lg font-semibold text-gray-700">{item.name}</label>
                            <button 
                                onClick={() => toggleLock(index)} 
                                className={`p-2 rounded ${item.locked ? 'bg-red-500' : 'bg-green-500'} text-white`}
                            >
                                {item.locked ? 'Unlock' : 'Lock'}
                            </button>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={totalTime.days * 24 * 60 + totalTime.hours * 60 + totalTime.minutes}
                            value={item.duration}
                            onChange={(e) => handleDurationChange(index, e.target.value)}
                            disabled={item.locked}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-2 text-sm text-gray-600">
                            <span>{item.duration} minutes</span>
                            <span>{Math.round(item.duration / (totalTime.days * 24 * 60 + totalTime.hours * 60 + totalTime.minutes) * 100)}%</span>
                        </div>
                        <div className="flex justify-between mt-4">
                            <button onClick={() => reorderEvents(index, 'up')} className="bg-green-500 text-white p-2 rounded">Move Up</button>
                            <button onClick={() => reorderEvents(index, 'down')} className="bg-yellow-500 text-white p-2 rounded">Move Down</button>
                            <button onClick={() => deleteEvent(index)} className="bg-red-500 text-white p-2 rounded">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-8 text-center text-lg font-semibold text-gray-700">
                Total time: {totalTime.days} days, {totalTime.hours} hours, {totalTime.minutes} minutes
            </p>

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Time Table</h2>
                <table className="min-w-full bg-white">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b">Date</th>
                            <th className="py-2 px-4 border-b">Task</th>
                            <th className="py-2 px-4 border-b">Duration</th>
                            <th className="py-2 px-4 border-b">Start Time</th>
                            <th className="py-2 px-4 border-b">End Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {generateTimeTable(events, startDateTime).map((row, index) => (
                            <tr key={index}>
                                <td className="py-2 px-4 border-b">{row.date}</td>
                                <td className="py-2 px-4 border-b">{row.task}</td>
                                <td className="py-2 px-4 border-b">{row.duration}</td>
                                <td className="py-2 px-4 border-b">{row.startTime}</td>
                                <td className="py-2 px-4 border-b">{row.endTime}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
