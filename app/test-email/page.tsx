'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const sendTestEmail = async (type: 'test' | 'approval') => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, type }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ Success: ${data.message}`);
      } else {
        setResult(`❌ Error: ${data.error}${data.details ? ` - ${data.details}` : ''}`);
      }
    } catch (error) {
      setResult(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Email Functionality</CardTitle>
          <p className="text-muted-foreground">
            Test the Brevo email integration before using it with real users.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Test User"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex space-x-4">
            <Button
              onClick={() => sendTestEmail('test')}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Send Test Email'}
            </Button>
            
            <Button
              onClick={() => sendTestEmail('approval')}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Approval Email'}
            </Button>
          </div>

          {result && (
            <div className={`p-4 rounded-md ${
              result.startsWith('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Make sure you have set the <code>BREVO_API_KEY</code> environment variable</li>
              <li>Get your API key from <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="underline">Brevo Dashboard</a></li>
              <li>Add it to your <code>.env.local</code> file</li>
              <li>Restart your development server</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
