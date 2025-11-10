'use client';
import React, { useState, useEffect } from 'react';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Logs</h1>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Admin</th>
              <th className="border p-2 text-left">Action</th>
              <th className="border p-2 text-left">Details</th>
              <th className="border p-2 text-left">Date/Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log: any) => (
                <tr key={log.log.id}>
                  <td className="border p-2">{log.admin?.name || 'Unknown'}</td>
                  <td className="border p-2">{log.log.action}</td>
                  <td className="border p-2">{log.log.details}</td>
                  <td className="border p-2">{new Date(log.log.createdAt).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border p-2 text-center">No logs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 