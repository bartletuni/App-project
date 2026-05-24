import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock the external dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

describe('POST /api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if name is missing', async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: 'user-123' },
    });

    const req = new NextRequest('http://localhost/api/user/profile', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required');
  });

  it('should return 400 if name is empty or only whitespace', async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: 'user-123' },
    });

    const req = new NextRequest('http://localhost/api/user/profile', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name is required');
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as any).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/user/profile', {
      method: 'POST',
      body: JSON.stringify({ name: 'Valid Name' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 200 and update user if name is valid', async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: 'user-123' },
    });

    (prisma.user.update as any).mockResolvedValue({
      id: 'user-123',
      name: 'Valid Name',
    });

    const req = new NextRequest('http://localhost/api/user/profile', {
      method: 'POST',
      body: JSON.stringify({ name: '  Valid Name  ' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.name).toBe('Valid Name');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { name: 'Valid Name' },
    });
  });
});
