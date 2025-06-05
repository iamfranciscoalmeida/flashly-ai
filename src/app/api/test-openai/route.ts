import { NextResponse } from 'next/server';
import { testOpenAIConnection } from '@/lib/openai-config';

export async function GET() {
  try {
    console.log('🔍 Testing OpenAI API connection...');
    
    // Test the connection
    const isConnected = await testOpenAIConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'OpenAI API connection is working correctly',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'OpenAI API connection failed',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ OpenAI test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Unknown error occurred',
      error: {
        type: error.constructor.name,
        code: error.code,
        status: error.status
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 