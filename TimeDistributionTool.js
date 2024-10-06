import React, { useState, useEffect } from 'react';
import { calculateTotalTime, updateChart, generateTimeTable } from './utils'; // Assuming these are in a separate file

const TimeDistributionTool = () => {
    const [startDateTime, setStartDateTime] = useState('2023-10-06T18:13');
    const [endDateTime, setEndDateTime] = useState('2023-10-07T07:35');
    const [totalTime, setTotalTime] = useState({ days: 0, hours: 0, minutes: 0 });
    const [events, setEvents] = useState([
        { name: 'Work', duration: 0, color: '#FF6B6B' },
        { name: 'Freshen up', duration: 0, color: '#4ECDC4' },
        { name: 'Meditate', duration: 0, color: '#45B7D1' },
        { name: 'Buffer', duration: 0, color: '#FFA07A' }
    ]);
    const [newEventName, setNewEventName] = useState('');
    const [deletedEvents, setDeletedEvents] = useState([]);

    useEffect(() => {
        const { totalMinutes, formattedTime } = calculateTotalTime(startDateTime, endDateTime);
        setTotalTime(formattedTime);
        updateChart(events, totalMinutes);
    }, [startDateTime, endDateTime, events]);

    const handleNowButton = (setter) => {
        const now = new Date();
        const formattedNow = now.toISOString().slice(0, 16);
        setter(formattedNow);
    };

    const handleDurationChange = (index, newDuration) => {
        const newEvents = [...events];
        newEvents[index].duration = parseInt(newDuration);
        adjustOtherEvents(newEvents, index);
        setEvents(newEvents);
    };

    const adjustOtherEvents = (newEvents, changedIndex) => {
        const totalMinutes = calculateTotalMinutes();
        const currentTotal = newEvents.reduce((sum, event) => sum + event.duration, 0);
        const difference = totalMinutes - currentTotal;

        if (difference === 0) return;

        const otherEvents = newEvents.filter((_, index) => index !== changedIndex);
        const otherTotal = otherEvents.reduce((sum, event) => sum + event.duration, 0);

        otherEvents.forEach((event, index) => {
            const proportion = event.duration / otherTotal;
            const adjustment = Math.round(difference * proportion);
            newEvents[index === changedIndex ? index : index + (index >= changedIndex ? 1 : 0)].duration += adjustment;
        });

        // Ensure total is exactly 100%
        const finalTotal = newEvents.reduce((sum, event) => sum + event.duration, 0);
        if (finalTotal !== totalMinutes) {
            const lastIndex = newEvents.length - 1;
            newEvents[lastIndex].duration += totalMinutes - finalTotal;
        }
    };

    const calculateTotalMinutes = () => {
        return totalTime.days * 24 * 60 + totalTime.hours * 60 + totalTime.minutes;
    };

    const distributeTime = () => {
        const totalMinutes = calculateTotalMinutes();
        const equalShare = Math.floor(totalMinutes / events.length);
        const remainder = totalMinutes % events.length;

        const newEvents = events.map((event, index) => ({
            ...event,
            duration: equalShare + (index < remainder ? 1 : 0)
        }));

        setEvents(newEvents);
    };

    return (
        <div className="container mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Enhanced Time Distribution Tool</h1>
            
            <div className="mb-4 flex justify-between">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date/Time:</label>
                    <div className="mb-4">
                        <button onClick={distributeTime} className="bg-purple-500 text-white p-2 rounded mr-2">Distribute</button>
                        <input 
                            type="text" 
                            value={newEventName} 
                            onChange={(e) => setNewEventName(e.target.value)} 
                            placeholder="New event name" 
                            className="mr-2 p-2 border rounded"
                        />
                        <button onClick={addNewEvent} className="bg-blue-500 text-white p-2 rounded">Add Event</button>
                        <button onClick={undoDelete} className="bg-gray-500 text-white p-2 rounded ml-2">Undo Delete</button>
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

            <div className="mb-4">
                <input 
                    type="text" 
                    value={newEventName} 
                    onChange={(e) => setNewEventName(e.target.value)} 
                    placeholder="New event name" 
                    className="mr-2 p-2 border rounded"
                />
                <button onClick={addNewEvent} className="bg-blue-500 text-white p-2 rounded">Add Event</button>
                <button onClick={undoDelete} className="bg-gray-500 text-white p-2 rounded ml-2">Undo Delete</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((item, index) => (
                    <div key={item.name} className="bg-white p-4 rounded-md shadow">
                        <label className="block text-lg font-semibold mb-2 text-gray-700">{item.name}</label>
                        <input
                            type="range"
                            min="0"
                            max={totalTime.days * 24 * 60 + totalTime.hours * 60 + totalTime.minutes}
                            value={item.duration}
                            onChange={(e) => handleDurationChange(index, e.target.value)}
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
