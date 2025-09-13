'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BulkProductUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,slug,description,shortDescription,sku,price,comparePrice,costPrice,categoryId,subcategoryId,tags,weight,isFeatured,isActive,isDigital,requiresShipping,taxable,metaTitle,metaDescription
"Sample Product","sample-product","This is a sample product description","Short description","SKU001",29.99,39.99,15.00,"","","tag1,tag2",1.5,false,true,false,true,true,"Sample Product Meta Title","Sample product meta description"
"Another Product","another-product","Another product description","Another short description","SKU002",19.99,24.99,10.00,"","","tag3,tag4",0.8,true,true,false,true,true,"Another Product Meta Title","Another product meta description"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'bulk_product_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResults(null);
    setError('');
    const fileInput = document.getElementById('csvFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Bulk Product Upload</h1>
          <button
            onClick={() => router.push('/products')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Products
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">📋 Instructions</h2>
          <ul className="space-y-2 text-blue-700">
            <li>• Download the CSV template below to see the required format</li>
            <li>• Fill in your product data following the template structure</li>
            <li>• Required fields: name, price</li>
            <li>• Optional fields can be left empty</li>
            <li>• Boolean fields should be "true" or "false"</li>
            <li>• Tags should be comma-separated within quotes</li>
            <li>• Save your file as CSV format</li>
            <li>• Upload the file using the form below</li>
          </ul>
        </div>

        {/* Download Template */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">📥 Download Template</h2>
          <p className="text-gray-600 mb-4">
            Download the CSV template to see the correct format for bulk product upload.
          </p>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            📄 Download CSV Template
          </button>
        </div>

        {/* Upload Form */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📤 Upload Products</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="csvFile">
                Select CSV File
              </label>
              <input
                type="file"
                id="csvFile"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                disabled={uploading}
              />
              {file && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Products'}
              </button>
              
              {(file || results) && (
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">📊 Upload Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-800">
                  {results.successful || 0}
                </div>
                <div className="text-green-600">Successful</div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-800">
                  {results.failed || 0}
                </div>
                <div className="text-red-600">Failed</div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-800">
                  {(results.successful || 0) + (results.failed || 0)}
                </div>
                <div className="text-blue-600">Total Processed</div>
              </div>
            </div>

            {/* Success Details */}
            {results.successfulProducts && results.successfulProducts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-semibold text-green-800 mb-2">✅ Successfully Created Products</h3>
                <div className="bg-green-50 border border-green-200 rounded p-3 max-h-60 overflow-y-auto">
                  {results.successfulProducts.map((product: any, index: number) => (
                    <div key={index} className="text-sm text-green-700 mb-1">
                      {product.name} (SKU: {product.sku || 'N/A'})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Details */}
            {results.errors && results.errors.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-red-800 mb-2">❌ Errors</h3>
                <div className="bg-red-50 border border-red-200 rounded p-3 max-h-60 overflow-y-auto">
                  {results.errors.map((error: any, index: number) => (
                    <div key={index} className="text-sm text-red-700 mb-2">
                      <strong>Row {error.row}:</strong> {error.message}
                      {error.product && (
                        <div className="ml-4 text-red-600">
                          Product: {error.product.name || 'Unknown'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => router.push('/products')}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View All Products
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 