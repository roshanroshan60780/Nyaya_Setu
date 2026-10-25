import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';

describe('NyayaSetu Frontend UI Component Suite', () => {
  describe('Badge Component', () => {
    it('renders with appropriate status styling', () => {
      render(
        <Badge variant="status" value="in_progress">
          In Progress
        </Badge>
      );
      const badge = screen.getByText('In Progress');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-yellow-100');
    });

    it('renders escalated status with warning colors', () => {
      render(
        <Badge variant="status" value="escalated">
          Escalated
        </Badge>
      );
      const badge = screen.getByText('Escalated');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-red-100');
    });

    it('renders category badge', () => {
      render(
        <Badge variant="category" value="academic">
          academic
        </Badge>
      );
      expect(screen.getByText('academic')).toBeInTheDocument();
    });
  });

  describe('Button Component', () => {
    it('renders text and handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>File Complaint</Button>);
      const button = screen.getByText('File Complaint');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when loading is true', () => {
      render(<Button loading>Submitting</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Card Component', () => {
    it('renders card header and body contents', () => {
      render(
        <Card>
          <CardHeader>Grievance Summary</CardHeader>
          <CardBody>Wi-Fi disruption details</CardBody>
        </Card>
      );
      expect(screen.getByText('Grievance Summary')).toBeInTheDocument();
      expect(screen.getByText('Wi-Fi disruption details')).toBeInTheDocument();
    });
  });

  describe('Input Component', () => {
    it('renders input with label and displays validation errors', () => {
      render(
        <Input
          label="Subject"
          placeholder="Enter subject"
          error="Subject must be at least 5 characters"
        />
      );
      expect(screen.getByText('Subject')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter subject')).toBeInTheDocument();
      expect(screen.getByText('Subject must be at least 5 characters')).toBeInTheDocument();
    });
  });

  describe('EmptyState Component', () => {
    it('renders title and description properly', () => {
      render(
        <EmptyState
          title="No grievances recorded"
          description="Submit a complaint to start tracking."
        />
      );
      expect(screen.getByText('No grievances recorded')).toBeInTheDocument();
      expect(screen.getByText('Submit a complaint to start tracking.')).toBeInTheDocument();
    });
  });
});
