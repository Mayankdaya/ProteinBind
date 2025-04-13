import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/nvidia/multimer/status/[reqId]/route';
import { REQUEST_TIMEOUT } from '@/app/api/utils';

global.fetch = jest.fn();

describe('NVIDIA Multimer Status API', () => {
  const mockReqId = 'test-request-id';
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    process.env.NVIDIA_MULTIMER_API_KEY = mockApiKey;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NVIDIA_MULTIMER_API_KEY;
  });

  it('should handle missing API key', async () => {
    delete process.env.NVIDIA_MULTIMER_API_KEY;
    
    const request = new NextRequest('http://localhost/api/nvidia/multimer/status');
    const response = await GET(request, { params: { reqId: mockReqId } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('NVIDIA Multimer API key not configured');
  });

  it('should handle pending status correctly', async () => {
    const mockResponse = {
      status: 202,
      ok: false,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        status: 'RUNNING',
        progress: 50
      })),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/nvidia/multimer/status');
    const response = await GET(request, { params: { reqId: mockReqId } });
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.status).toBe('pending');
    expect(data.message).toBe('Structure prediction in progress');
    expect(data.details).toEqual({
      status: 'RUNNING',
      progress: 50
    });
  });

  it('should handle completed prediction correctly', async () => {
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

    const request = new NextRequest('http://localhost/api/nvidia/multimer/status');
    const response = await GET(request, { params: { reqId: mockReqId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('complete');
    expect(data.pdb).toBe(mockPdbStructure);
  });

  it('should handle invalid response format', async () => {
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

    const request = new NextRequest('http://localhost/api/nvidia/multimer/status');
    const response = await GET(request, { params: { reqId: mockReqId } });
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Invalid response format: missing structure data');
  });

  it('should handle API errors correctly', async () => {
    const mockErrorMessage = 'Internal server error';
    const mockResponse = {
      status: 500,
      ok: false,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        error: mockErrorMessage
      })),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/nvidia/multimer/status');
    const response = await GET(request, { params: { reqId: mockReqId } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(mockErrorMessage);
  });

  it('should handle network timeout', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out'));
        }, REQUEST_TIMEOUT + 100);
      });
    });

    const request = new NextRequest('http://localhost/api/nvidia/multimer/status');
    const response = await GET(request, { params: { reqId: mockReqId } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Request timed out');
  });

  it('should handle invalid JSON response', async () => {
    const mockResponse = {
      status: 200,
      ok: true,
      text: jest.fn().mockResolvedValue('Invalid JSON'),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/nvidia/multimer/status');
    const response = await GET(request, { params: { reqId: mockReqId } });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Invalid response from NVIDIA API');
    expect(data.details).toBe('Invalid JSON');
  });
}));