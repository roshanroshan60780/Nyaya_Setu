import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center mb-6 text-primary-600 font-extrabold text-4xl shadow-inner">
        404
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-gray-500 max-w-md mb-8">
        The grievance record, view, or portal link you requested could not be located.
      </p>
      <div className="flex gap-4">
        <Link to="/">
          <Button variant="primary">
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </Button>
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </button>
      </div>
    </div>
  );
}
