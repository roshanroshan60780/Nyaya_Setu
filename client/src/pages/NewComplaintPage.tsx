import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UploadCloud,
  File,
  X,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import api from '../lib/api';
import Card, { CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';

const CATEGORIES = [
  { value: 'academic', label: 'Academic (Marks, Attendance, Faculty, Exams)' },
  { value: 'infrastructure', label: 'Infrastructure (Labs, Classrooms, Wi-Fi, Water, Power)' },
  { value: 'hostel', label: 'Hostel & Mess (Mess food, Room maintenance, Security)' },
  { value: 'administrative', label: 'Administrative (ID Cards, Certificates, Registrar)' },
  { value: 'financial', label: 'Financial (Fees, Scholarships, Fines, Refunds)' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low (General inquiry or minor feedback)' },
  { value: 'medium', label: 'Medium (Standard service disruption)' },
  { value: 'high', label: 'High (Directly impacts coursework or living conditions)' },
  { value: 'critical', label: 'Critical (Safety, legal, scholarship deadline, or severe distress)' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('academic');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    addValidFiles(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files) return;
    const selected = Array.from(e.dataTransfer.files);
    addValidFiles(selected);
  };

  const addValidFiles = (newFiles: File[]) => {
    const valid: File[] = [];
    let fileError = '';

    if (files.length + newFiles.length > 5) {
      setErrors((prev) => ({ ...prev, files: 'Maximum 5 files can be attached.' }));
      return;
    }

    for (const f of newFiles) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        fileError = `File "${f.name}" has an unsupported format. Only images, PDF, and DOC files are accepted.`;
        break;
      }
      if (f.size > MAX_FILE_SIZE) {
        fileError = `File "${f.name}" exceeds the 5MB size limit.`;
        break;
      }
      valid.push(f);
    }

    if (fileError) {
      setErrors((prev) => ({ ...prev, files: fileError }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.files;
        return copy;
      });
      setFiles((prev) => [...prev, ...valid]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters long';
    } else if (title.length > 200) {
      errs.title = 'Title cannot exceed 200 characters';
    }

    if (!description.trim()) {
      errs.description = 'Description is required';
    } else if (description.trim().length < 20) {
      errs.description = 'Please provide more detail (at least 20 characters)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('description', description.trim());

      files.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const createdComplaint = response.data.complaint;
      navigate(`/complaints/${createdComplaint.id}`);
    } catch (err: any) {
      setApiError(
        err.response?.data?.error ||
          err.response?.data?.details?.[0]?.message ||
          'Failed to submit grievance. Please verify input and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File a New Grievance</h1>
          <p className="text-xs text-gray-500">
            Submit your complaint for institutional review. An append-only cryptographic audit record will be initialized.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>{apiError}</div>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-5">
            {/* Title */}
            <div>
              <Input
                label="Grievance Subject / Title *"
                placeholder="e.g., Water leakage in Girls Hostel Room 204"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
                helperText="Be specific and concise (5 - 200 characters)"
              />
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Category *"
                  options={CATEGORIES}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="Priority Level *"
                  options={PRIORITIES}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <TextArea
                label="Detailed Description *"
                rows={5}
                placeholder="Describe the issue in full detail: date of incident, location, persons contacted earlier, and desired resolution..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
                helperText={`${description.length} characters (min 20)`}
              />
            </div>

            {/* Attachments Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supporting Attachments (Optional)
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 hover:bg-primary-50/20 transition-all cursor-pointer relative"
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Click to browse or drag and drop files here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: PDF, PNG, JPG, DOC (Max 5MB per file, up to 5 files)
                </p>
              </div>

              {errors.files && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.files}
                </p>
              )}

              {/* Selected Files List */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Attached Files ({files.length}/5)
                  </p>
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <File className="w-4 h-4 text-primary-500 shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{file.name}</span>
                        <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy notice banner */}
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <strong>Transparency Notice:</strong> All updates and status transitions generate a SHA-256
                cryptographic hash chain entry to prevent post-submission tampering. Never include sensitive credentials,
                banking passwords, or OTPs.
              </div>
            </div>
          </CardBody>

          <CardFooter className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit Grievance
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
