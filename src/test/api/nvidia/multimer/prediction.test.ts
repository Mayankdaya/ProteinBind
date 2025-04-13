import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/nvidia/multimer/route';
import { REQUEST_TIMEOUT } from '@/app/api/utils';

global.fetch = jest.fn();

describe('NVIDIA Multimer Prediction API', () => {
  const mockApiKey = 'test-api-key';
  const validSequences = ['MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG'];
  
  beforeEach(() => {
    process.env.NVIDIA_MULTIMER_API_KEY = mockApiKey;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NVIDIA_MULTIMER_API_KEY;
  });

  it('should handle missing API key', async () => {
    delete process.env.NVIDIA_MULTIMER_API_KEY;
    
    const request = new NextRequest('http://localhost/api/nvidia/multimer', {
      method: 'POST',
      body: JSON.stringify({ sequences: validSequences })
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server configuration error');
  });

  it('should validate sequence input', async () => {
    const invalidSequences = ['INVALID123'];
    const request = new NextRequest('http://localhost/api/nvidia/multimer', {
      method: 'POST',
      body: JSON.stringify({ sequences: invalidSequences })
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Sequence contains invalid characters');
  });

  it('should handle accepted request with polling', async () => {
    const mockReqId = 'test-request-id';
    const mockResponse = {
      status: 202,
      ok: false,
      headers: new Headers({
        'Content-Type': 'application/json',
        'nvcf-reqid': mockReqId
      })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/nvidia/multimer', {
      method: 'POST',
      body: JSON.stringify({ sequences: validSequences })
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.status).toBe('pending');
    expect(data.reqId).toBe(mockReqId);
    expect(data.message).toBe('Request accepted, structure prediction in progress');
  });

  it('should handle successful prediction', async () => {
    const mockPdbStructure = 'ATOM  1  N  ALA A 1...';
    const mockResponse = {
      status: 200,
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        output: {
          structure: mockPdbStructure
        }
      })),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/nvidia/multimer', {
      method: 'POST',
      body: JSON.stringify({ sequences: validSequences })
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pdb).toBe(mockPdbStructure);
  });

  it('should handle retryable errors', async () => {
    const mockResponse = {
      status: 503,
      ok: false,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        type: 'ServiceUnavailable',
        message: 'Service is temporarily unavailable'
      })),
      headers: new Headers({
        'Content-Type': 'application/json',
        'Retry-After': '60'
      })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/nvidia/multimer', {
      method: 'POST',
      body: JSON.stringify({ sequences: validSequences })
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('NVIDIA Multimer API is temporarily unavailable. Please try again later');
    expect(data.retryAfter).toBe(60);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('should handle missing structure in response', async () => {
    const mockResponse = {
      status: 200,
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        output: {} // Missing structure field
      })),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/nvidia/multimer', {
      method: 'POST',
      body: JSON.stringify({ sequences: validSequences })
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('No structure data in response');
  });

  it('should handle network timeout', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out'));
        }, REQUEST_TIMEOUT + 100);
      });
    });

    const request = new NextRequest('http://localhost/api/nvidia/multimer', {
      method: 'POST',
      body: JSON.stringify({ sequences: validSequences })
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data.error).toBe('Request timed out');
    expect(data.retryAfter).toBeDefined();
  });
}));