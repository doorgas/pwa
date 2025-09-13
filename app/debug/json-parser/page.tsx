'use client';
import React, { useState } from 'react';
import { deepParseJSON, normalizeVariationAttributes, normalizeVariantOptions } from '../../../utils/jsonUtils';

export default function JsonParserDebugPage() {
  const [testInput, setTestInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const testCases = [
    {
      name: 'Double Encoded JSON',
      value: '"{\\\"color\\\":\\\"red\\\",\\\"size\\\":\\\"large\\\"}"'
    },
    {
      name: 'Triple Encoded JSON',
      value: '"\\"{\\\\\\"color\\\\\\":\\\\\\"red\\\\\\",\\\\\\"size\\\\\\":\\\\\\"large\\\\\\"}\\"" '
    },
    {
      name: 'Normal JSON Object',
      value: '{"color":"red","size":"large"}'
    },
    {
      name: 'JSON Array',
      value: '[{"name":"Color","values":["red","blue"]},{"name":"Size","values":["S","M","L"]}]'
    },
    {
      name: 'Stringified Array',
      value: '"[{\\"name\\":\\"Color\\",\\"values\\":[\\"red\\",\\"blue\\"]},{\\"name\\":\\"Size\\",\\"values\\":[\\"S\\",\\"M\\",\\"L\\"]}]"'
    }
  ];

  const handleTest = () => {
    setError('');
    try {
      const parsed = deepParseJSON(testInput);
      setResult(parsed);
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    }
  };

  const testSpecific = (value: string) => {
    setTestInput(value);
    setError('');
    try {
      const parsed = deepParseJSON(value);
      setResult(parsed);
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">JSON Parser Debug Tool</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Test Input</h2>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
              placeholder="Paste your JSON string here..."
            />
            <button
              onClick={handleTest}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Parse JSON
            </button>
          </div>

          {/* Predefined Test Cases */}
          <div>
            <h3 className="font-semibold mb-2">Test Cases:</h3>
            <div className="space-y-2">
              {testCases.map((testCase, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">{testCase.name}</span>
                    <button
                      onClick={() => testSpecific(testCase.value)}
                      className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                      Test
                    </button>
                  </div>
                  <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
                    {testCase.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Results</h2>
            
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                <h3 className="font-medium text-red-800">Error:</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {result !== null && (
              <div className="space-y-3">
                <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Parsed Result:</h3>
                  <pre className="text-sm bg-white p-2 rounded border overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>

                <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Type Information:</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Type:</strong> {typeof result}</p>
                    <p><strong>Is Array:</strong> {Array.isArray(result).toString()}</p>
                    <p><strong>Is Object:</strong> {(result && typeof result === 'object' && !Array.isArray(result)).toString()}</p>
                    {Array.isArray(result) && <p><strong>Length:</strong> {result.length}</p>}
                    {result && typeof result === 'object' && !Array.isArray(result) && (
                      <p><strong>Keys:</strong> {Object.keys(result).join(', ')}</p>
                    )}
                  </div>
                </div>

                {/* Test normalization functions */}
                {result && (
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <h3 className="font-medium text-yellow-800 mb-2">normalizeVariantOptions():</h3>
                      <pre className="text-sm bg-white p-2 rounded border overflow-auto">
                        {JSON.stringify(normalizeVariantOptions(testInput), null, 2)}
                      </pre>
                    </div>

                    <div className="p-3 bg-purple-100 border border-purple-300 rounded-lg">
                      <h3 className="font-medium text-purple-800 mb-2">normalizeVariationAttributes():</h3>
                      <pre className="text-sm bg-white p-2 rounded border overflow-auto">
                        {JSON.stringify(normalizeVariationAttributes(testInput), null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Usage Examples</h2>
        <div className="space-y-2 text-sm">
          <p><strong>deepParseJSON(value):</strong> Recursively parses JSON until a non-string value is reached</p>
          <p><strong>normalizeVariantOptions(value):</strong> Normalizes variant attribute combinations to a consistent object format</p>
          <p><strong>normalizeVariationAttributes(value):</strong> Normalizes variation attributes array with proper structure</p>
        </div>
      </div>
    </div>
  );
} 