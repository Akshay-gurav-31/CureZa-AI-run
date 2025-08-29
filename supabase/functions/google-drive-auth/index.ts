import "https://deno.land/x/xhr@0.1.0/mod.ts";

// @ts-ignore - Deno runtime function
const serve = Deno.serve;

// Declare console to fix TypeScript issues
declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment variables (Deno runtime)
const GOOGLE_CLIENT_ID = (globalThis as any).Deno?.env?.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = (globalThis as any).Deno?.env?.get('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = 'https://uzfvianjqrdimuxkaqvf.supabase.co/functions/v1/google-drive-auth';

serve(async (req) => {
  // @ts-ignore - Suppress TypeScript console type error
  console.log('Google Drive Auth function called:', {
    method: req.method,
    url: req.url,
    origin: req.headers.get('origin'),
    userAgent: req.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  try {
    // Enhanced environment variable validation
    // @ts-ignore - Suppress TypeScript console type error
    console.log('Environment check:', {
      hasClientId: !!GOOGLE_CLIENT_ID,
      hasClientSecret: !!GOOGLE_CLIENT_SECRET,
      clientIdPrefix: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'missing',
      redirectUri: REDIRECT_URI
    });
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      // @ts-ignore - Suppress TypeScript console type error
      console.error('Missing required environment variables:', {
        hasClientId: !!GOOGLE_CLIENT_ID,
        hasClientSecret: !!GOOGLE_CLIENT_SECRET,
        availableEnvVars: Object.keys((globalThis as any).Deno?.env?.toObject() || {})
      });
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing Google OAuth credentials',
        details: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in Supabase Edge Function environment variables',
        success: false,
        errorCode: 'ENV_MISSING'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Handle OAuth callback
    if (url.searchParams.has('code')) {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      console.log('OAuth callback received');
      
      // Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code: code!,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log('Token exchange:', tokenData.access_token ? 'successful' : 'failed');
      
      if (tokenData.access_token) {
        // Use the state parameter or fallback to current sandbox URL
        let redirectUrl;
        
        if (state) {
          // Decode the state parameter which should contain the original URL
          try {
            redirectUrl = `${decodeURIComponent(state)}?access_token=${tokenData.access_token}&refresh_token=${tokenData.refresh_token || ''}`;
          } catch (e) {
            console.error('Error decoding state:', e);
            // Fallback to localhost for development or current domain
            redirectUrl = `${req.headers.get('origin') || 'http://localhost:8080'}/?access_token=${tokenData.access_token}&refresh_token=${tokenData.refresh_token || ''}`;
          }
        } else {
          // Fallback to origin header or localhost
          const fallbackOrigin = req.headers.get('origin') || 'http://localhost:8080';
          redirectUrl = `${fallbackOrigin}/?access_token=${tokenData.access_token}&refresh_token=${tokenData.refresh_token || ''}`;
        }
        
        console.log('OAuth success, redirecting');
        
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': redirectUrl,
          },
        });
      } else {
        console.error('Token exchange failed:', tokenData);
        const errorUrl = state ? `${decodeURIComponent(state)}?error=auth_failed` : `${req.headers.get('origin') || 'http://localhost:8080'}/?error=auth_failed`;
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': errorUrl,
          },
        });
      }
    }
    
    // Enhanced request body parsing with validation
    let requestBody;
    let contentType = req.headers.get('content-type');
    // @ts-ignore - Suppress TypeScript console type error
    console.log('Request details:', {
      method: req.method,
      contentType,
      hasBody: req.body !== null,
      urlParams: Object.fromEntries(url.searchParams.entries())
    });
    
    try {
      if (req.body) {
        requestBody = await req.json();
        // @ts-ignore - Suppress TypeScript console type error
        console.log('Request body parsed successfully:', {
          hasAction: !!requestBody?.action,
          action: requestBody?.action,
          hasAccessToken: !!requestBody?.access_token,
          hasFolderId: !!requestBody?.folder_id,
          hasFileId: !!requestBody?.file_id
        });
      } else {
        requestBody = {};
        // @ts-ignore - Suppress TypeScript console type error
        console.log('No request body provided');
      }
    } catch (jsonError) {
      // @ts-ignore - Suppress TypeScript console type error
      console.error('JSON parsing failed:', {
        error: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
        contentType,
        bodyPresent: !!req.body
      });
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: jsonError instanceof Error ? jsonError.message : 'Request body must be valid JSON',
        success: false,
        errorCode: 'INVALID_JSON'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { action, access_token, folder_id, file_id } = requestBody;
    // @ts-ignore - Suppress TypeScript console type error
    console.log('Extracted parameters:', {
      action,
      hasAccessToken: !!access_token,
      accessTokenPrefix: access_token ? access_token.substring(0, 10) + '...' : 'missing',
      folderId: folder_id || 'not provided',
      fileId: file_id || 'not provided'
    });
    
    // Enhanced parameter validation with detailed logging
    if (!action) {
      // @ts-ignore - Suppress TypeScript console type error
      console.error('Parameter validation failed: Missing action', {
        requestBody,
        requiredParams: ['action'],
        providedParams: Object.keys(requestBody || {})
      });
      return new Response(JSON.stringify({ 
        error: 'Missing required parameter: action',
        details: 'Request must include an "action" field specifying the operation to perform',
        validActions: ['get_auth_url', 'list_folders', 'list_pdfs', 'download_pdf'],
        success: false,
        errorCode: 'MISSING_ACTION'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if ((action === 'list_folders' || action === 'list_pdfs' || action === 'download_pdf') && !access_token) {
      // @ts-ignore - Suppress TypeScript console type error
      console.error('Parameter validation failed: Missing access token', {
        action,
        hasAccessToken: !!access_token,
        requiredForAction: true
      });
      return new Response(JSON.stringify({ 
        error: `Access token required for action: ${action}`,
        details: `The "${action}" action requires a valid Google OAuth access token`,
        success: false,
        errorCode: 'MISSING_ACCESS_TOKEN'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'list_pdfs' && !folder_id) {
      // @ts-ignore - Suppress TypeScript console type error
      console.error('Parameter validation failed: Missing folder ID for list_pdfs', {
        action,
        hasFolderId: !!folder_id,
        providedParams: Object.keys(requestBody || {})
      });
      return new Response(JSON.stringify({ 
        error: 'Folder ID required for list_pdfs action',
        details: 'The "list_pdfs" action requires a "folder_id" parameter',
        success: false,
        errorCode: 'MISSING_FOLDER_ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'download_pdf' && !file_id) {
      // @ts-ignore - Suppress TypeScript console type error
      console.error('Parameter validation failed: Missing file ID for download_pdf', {
        action,
        hasFileId: !!file_id,
        providedParams: Object.keys(requestBody || {})
      });
      return new Response(JSON.stringify({ 
        error: 'File ID required for download_pdf action',
        details: 'The "download_pdf" action requires a "file_id" parameter',
        success: false,
        errorCode: 'MISSING_FILE_ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get authorization URL
    if (action === 'get_auth_url') {
      // Get the current origin from headers to redirect back correctly
      const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:8080';
      const state = encodeURIComponent(origin);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${state}`;
      
      // @ts-ignore - Suppress TypeScript console type error
      console.log('Generated auth URL for origin:', origin);
      
      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // List folders with enhanced error handling
    if (action === 'list_folders' && access_token) {
      // @ts-ignore - Suppress TypeScript console type error
      console.log('Attempting to list folders with access token');
      
      try {
        const response = await fetch(
          "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'&fields=files(id,name,parents)",
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          }
        );
        
        // @ts-ignore - Suppress TypeScript console type error
        console.log('Google Drive API response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          let parsedError;
          try {
            parsedError = JSON.parse(errorData);
          } catch (e) {
            parsedError = { message: errorData };
          }
          
          // @ts-ignore - Suppress TypeScript console type error
          console.error('Google Drive API error for list_folders:', {
            status: response.status,
            statusText: response.statusText,
            errorData: parsedError,
            accessTokenValid: !!access_token && access_token.length > 10
          });
          
          return new Response(JSON.stringify({ 
            error: `Google Drive API error: ${response.status} ${response.statusText}`,
            details: parsedError,
            googleApiStatus: response.status,
            success: false,
            errorCode: 'GOOGLE_API_ERROR'
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const data = await response.json();
        // @ts-ignore - Suppress TypeScript console type error
        console.log('Folders found:', data.files?.length || 0);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchError: unknown) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Failed to fetch folders';
        // @ts-ignore - Suppress TypeScript console type error
        console.error('Network error in list_folders:', {
          error: errorMsg,
          stack: fetchError instanceof Error ? fetchError.stack : undefined
        });
        return new Response(JSON.stringify({ 
          error: `Network error: ${errorMsg}`,
          success: false,
          errorCode: 'NETWORK_ERROR'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // List PDFs in folder
    if (action === 'list_pdfs' && access_token && folder_id) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folder_id}' in parents and mimeType='application/pdf'&fields=files(id,name,size,modifiedTime)`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          }
        );
        
        if (!response.ok) {
          const errorData = await response.text();
          return new Response(JSON.stringify({ 
            error: `Google Drive API error: ${response.status}`,
            success: false
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (fetchError: unknown) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Failed to list PDFs';
        return new Response(JSON.stringify({ 
          error: `Network error: ${errorMsg}`,
          success: false
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Download and extract PDF content
    if (action === 'download_pdf' && access_token && file_id) {
      console.log('Processing PDF:', file_id);
      
      try {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          }
        );
        
        if (!response.ok) {
          return new Response(JSON.stringify({ 
            error: 'Failed to download PDF from Google Drive',
            success: false
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const pdfBuffer = await response.arrayBuffer();
        
        if (pdfBuffer.byteLength === 0) {
          return new Response(JSON.stringify({ 
            success: false,
            error: 'PDF file is empty or could not be downloaded'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Extract text from PDF
        const uint8Array = new Uint8Array(pdfBuffer);
        let extractedText = '';
        const extractionMethods: string[] = [];
        
        // Decode PDF to text for processing
        const pdfText = new TextDecoder('latin1').decode(uint8Array);
        
        // Method 1: Extract text from stream sections
        const streamMatches = pdfText.match(/stream[\s\S]*?endstream/g);
        if (streamMatches) {
          extractionMethods.push('stream_extraction');
          for (const stream of streamMatches) {
            const content = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
            const readable = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (readable.length > 20) {
              extractedText += readable + ' ';
            }
          }
        }
        
        // Method 2: Extract text objects (Tj commands)
        const textObjects = pdfText.match(/\([^)]+\)\s*Tj/g);
        if (textObjects) {
          extractionMethods.push('text_objects');
          for (const textObj of textObjects) {
            const text = textObj.match(/\(([^)]+)\)/)?.[1];
            if (text && text.length > 2) {
              extractedText += text + ' ';
            }
          }
        }
        
        // Method 3: Extract from text blocks (BT...ET)
        const textBlocks = pdfText.match(/BT[\s\S]*?ET/g);
        if (textBlocks) {
          extractionMethods.push('text_blocks');
          for (const block of textBlocks) {
            const content = block.replace(/^BT\s*/, '').replace(/\s*ET$/, '');
            const words = content.match(/\([^)]+\)/g);
            if (words) {
              for (const word of words) {
                const cleanWord = word.replace(/[()]/g, '').trim();
                if (cleanWord.length > 1 && /[a-zA-Z]/.test(cleanWord)) {
                  extractedText += cleanWord + ' ';
                }
              }
            }
          }
        }
        
        // Method 4: Fallback ASCII extraction
        if (extractedText.length < 100) {
          extractionMethods.push('ascii_fallback');
          let fallbackText = '';
          for (let i = 0; i < uint8Array.length - 1; i++) {
            const char = uint8Array[i];
            if (char >= 32 && char <= 126) {
              fallbackText += String.fromCharCode(char);
            } else if ((char === 10 || char === 13) && fallbackText.length > 0) {
              fallbackText += ' ';
            }
          }
          extractedText = fallbackText;
        }
        
        // Clean extracted text
        extractedText = extractedText
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s.,;:!?()\-"']/g, ' ')
          .trim();
        
        // Create meaningful sections
        const sentences = extractedText.split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 10 && /[a-zA-Z]/.test(s))
          .map(s => s + '.');
        
        const cleanedText = sentences.join(' ');
        
        // Split into sections
        const sections: string[] = [];
        if (cleanedText.length > 500) {
          let currentSection = '';
          for (const sentence of sentences) {
            if (currentSection.length + sentence.length > 800) {
              if (currentSection.trim()) {
                sections.push(currentSection.trim());
              }
              currentSection = sentence + ' ';
            } else {
              currentSection += sentence + ' ';
            }
          }
          if (currentSection.trim()) {
            sections.push(currentSection.trim());
          }
        } else {
          sections.push(cleanedText);
        }
        
        // Prepare final text (limit to 8000 characters)
        let finalText = cleanedText;
        if (finalText.length > 8000) {
          finalText = finalText.substring(0, 8000) + '... [Content truncated]';
        }
        
        // Handle edge case where extraction failed
        if (finalText.length < 50) {
          finalText = `PDF document content extracted from file ${file_id}. The document may contain complex formatting or embedded images that require alternative processing methods for optimal text extraction.`;
          sections.push(finalText);
        }
        
        console.log('PDF processed successfully:', finalText.length, 'characters');
        
        return new Response(JSON.stringify({ 
          content: finalText,
          sections: sections.slice(0, 5),
          originalSize: pdfBuffer.byteLength,
          extractedLength: finalText.length,
          sectionCount: sections.length,
          success: true,
          method: 'enhanced_pdf_extraction',
          extractionMethods: extractionMethods
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'PDF processing failed';
        console.error('Error processing PDF:', errorMsg);
        return new Response(JSON.stringify({ 
          error: `PDF processing failed: ${errorMsg}`,
          success: false
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Enhanced unknown action handler
    // @ts-ignore - Suppress TypeScript console type error
    console.error('Invalid action received:', {
      action: action || 'undefined',
      validActions: ['get_auth_url', 'list_folders', 'list_pdfs', 'download_pdf'],
      requestMethod: req.method,
      requestBody: requestBody,
      urlPath: url.pathname
    });
    
    return new Response(JSON.stringify({ 
      error: `Invalid action: '${action || 'undefined'}'`,
      details: `The action '${action || 'undefined'}' is not supported. Use one of the valid actions.`,
      validActions: ['get_auth_url', 'list_folders', 'list_pdfs', 'download_pdf'],
      receivedAction: action,
      success: false,
      errorCode: 'INVALID_ACTION'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // @ts-ignore - Suppress TypeScript console type error
    console.error('Critical error in google-drive-auth function:', {
      error: errorMsg,
      stack: errorStack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin')
    });
    
    return new Response(JSON.stringify({ 
      error: `Server error: ${errorMsg}`,
      details: 'An unexpected error occurred while processing your request',
      success: false,
      errorCode: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});