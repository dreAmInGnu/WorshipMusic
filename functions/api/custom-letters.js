/**
 * Cloudflare Pages Function for managing custom song index letters.
 * 
 * This API provides endpoints to:
 * - GET: Retrieve all custom letters
 * - POST: Save or update custom letters
 * - DELETE: Delete custom letters
 * 
 * Authentication is required for write operations (POST, DELETE).
 */

// Simple auth token for admin operations
const ADMIN_TOKEN = 'worship-music-admin-token';

// KV namespace binding name for storing custom letters
const CUSTOM_LETTERS_KV = 'CUSTOM_LETTERS';

// Key for storing custom letters in KV
const LETTERS_KEY = 'song_index_letters';

export async function onRequest(context) {
  const { request, env } = context;
  
  // Add CORS headers to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    // Check if KV namespace is available
    if (!env[CUSTOM_LETTERS_KV]) {
      return new Response(JSON.stringify({
        error: 'KV namespace not configured',
        message: 'The CUSTOM_LETTERS KV namespace is not bound to this worker.'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Handle GET request - Retrieve custom letters
    if (request.method === 'GET') {
      const letters = await env[CUSTOM_LETTERS_KV].get(LETTERS_KEY, { type: 'json' }) || {};
      
      return new Response(JSON.stringify({
        success: true,
        data: letters
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Handle POST request - Save custom letters
    if (request.method === 'POST') {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Admin token required for this operation'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Parse request body
      const requestData = await request.json();
      
      // Validate request data
      if (!requestData || typeof requestData !== 'object') {
        return new Response(JSON.stringify({
          error: 'Invalid data',
          message: 'Request body must be a valid JSON object'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Get existing letters
      const existingLetters = await env[CUSTOM_LETTERS_KV].get(LETTERS_KEY, { type: 'json' }) || {};
      
      // Merge with new letters
      const updatedLetters = { ...existingLetters, ...requestData };
      
      // Save to KV
      await env[CUSTOM_LETTERS_KV].put(LETTERS_KEY, JSON.stringify(updatedLetters));
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Custom letters saved successfully'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Handle DELETE request - Delete custom letters
    if (request.method === 'DELETE') {
      // Check authorization
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Admin token required for this operation'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Parse request body to get song IDs to delete
      const requestData = await request.json();
      
      // Validate request data
      if (!requestData || !Array.isArray(requestData.songIds)) {
        return new Response(JSON.stringify({
          error: 'Invalid data',
          message: 'Request body must contain a songIds array'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Get existing letters
      const existingLetters = await env[CUSTOM_LETTERS_KV].get(LETTERS_KEY, { type: 'json' }) || {};
      
      // Remove specified song IDs
      const { songIds } = requestData;
      songIds.forEach(id => {
        delete existingLetters[id];
      });
      
      // Save updated letters
      await env[CUSTOM_LETTERS_KV].put(LETTERS_KEY, JSON.stringify(existingLetters));
      
      return new Response(JSON.stringify({
        success: true,
        message: `Deleted custom letters for ${songIds.length} songs`
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // If we get here, the request method is not supported
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: `The ${request.method} method is not supported for this endpoint`
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error handling request:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
