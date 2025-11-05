// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { useAuthStore } from '@/stores/auth.store.js'
import { apiUrl, enableLog } from '@/helpers/config.js'

// Fields that should be treated as data-URI and stripped to raw base64 before sending.
// Default includes the existing field used by the app.
let globalDataUriFields = ['titleSignatureStamp']

/**
 * Configure which fields the fetch wrapper will treat as data-URI fields.
 * Pass an array of field names (strings). To reset to defaults, pass null/undefined.
 * This is useful if other parts of the app need the same automatic data-uri => base64
 * conversion without editing the wrapper source.
 * Per-request override is also supported via the `options.dataUriFields` argument
 * when calling the fetch wrapper methods.
 */
export function configureDataUriFields(fields) {
  if (!fields) {
    globalDataUriFields = ['titleSignatureStamp']
    return
  }
  if (!Array.isArray(fields)) throw new Error('configureDataUriFields expects an array of field names')
  globalDataUriFields = fields.slice()
}

export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  delete: request('DELETE'),
  postFile: requestFile('POST'),
  getFile: requestBlob('GET'),
  downloadFile: downloadFile
}

function request(method) {
  // Backwards compatible: callers may call (url, body) or (url, body, options)
  return async (url, body, options = {}) => {
    const requestOptions = {
      method,
      headers: authHeader(url)
    };
    if (body) {
      requestOptions.headers['Content-Type'] = 'application/json';
      // Prepare a safe copy so we don't mutate caller's object (tests expect original unchanged)
      let bodyCopy = body
      try {
        // Only copy if it's an object; otherwise pass through
        if (typeof body === 'object' && !Array.isArray(body)) {
          bodyCopy = { ...body }

          // Determine which fields to treat as data-URI fields for this request.
          // Order of precedence: options.dataUriFields -> globalDataUriFields
          const dataUriFields = Array.isArray(options.dataUriFields)
            ? options.dataUriFields
            : globalDataUriFields

          // For each configured field, if present and appears to be a data URI, strip prefix
          for (const f of dataUriFields) {
            if (typeof bodyCopy[f] === 'string' && bodyCopy[f].startsWith('data:')) {
              const m = bodyCopy[f].match(/^data:[^;]+;base64,(.*)$/)
              if (m) bodyCopy[f] = m[1]
            }
          }
        }
      } catch {
        // if something goes wrong, fall back to original body
        bodyCopy = body
      }
      requestOptions.body = JSON.stringify(bodyCopy);
    }
        
        let response;
        try {
           if (enableLog) {
            console.log(url, requestOptions)
           }
           response = await fetch(url, requestOptions);
        } catch (error) {
            // Customize your error message here
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }           
        }
            
        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
            // If server returned an error response, try to parse it
            const errorText = await response.text();
            let errorMessage;
            let errorObj;
            try {
                // Try to parse as JSON
                errorObj = JSON.parse(errorText);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                // If not valid JSON, use text as is
                errorMessage = errorText || `Ошибка ${response.status}`;
            }

            const error = new Error(errorMessage);
            error.status = response.status;
            if (errorObj) error.data = errorObj;
            // Re-throw the error for further handling if needed
            throw error;
        }
        
        return handleResponse(response);
    };
}

function requestFile(method) {
    return async (url, body) => {
        const requestOptions = {
            method,
            headers: authHeader(url)
        };
        if (body) {
            requestOptions.body = body;
        }

        let response;
        try {
          if (enableLog) {
            console.log(url, requestOptions)
          }
          response = await fetch(url, requestOptions);
        } catch (error) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }
        }

        // Status 422 (Unprocessable Entity) is handled differently because the API uses it to return
        // validation errors in a structured format that the client is expected to process, not throw as a generic error.
        if (!response.ok && response.status !== 422) {
            const errorText = await response.text();
            let errorMessage;
            let errorObj;
            try {
                errorObj = JSON.parse(errorText);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                errorMessage = errorText || `Ошибка ${response.status}`;
            }
            const error = new Error(errorMessage);
            error.status = response.status;
            if (errorObj) error.data = errorObj;
            throw error;
        }

        return handleResponse(response);
    };
}

// helper functions

function authHeader(url) {
  // return auth header with jwt if user is logged in and request is to the api url
  const { user } = useAuthStore()
  const isLoggedIn = !!user?.token
  if (isLoggedIn && url.startsWith(apiUrl)) {
    return { Authorization: `Bearer ${user.token}` }
  } else {
    return {}
  }
}

function requestBlob(method) {
    return async (url) => {
        const requestOptions = {
            method,
            headers: authHeader(url)
        };
        
        let response;
        try {
           if (enableLog) {
            console.log(url, requestOptions)
           }
           response = await fetch(url, requestOptions);
        } catch (error) {
            // Customize your error message here
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Не удалось соединиться с сервером. Пожалуйста, проверьте подключение к сети.');
            } else {
                throw new Error('Произошла непредвиденная ошибка при обращении к серверу: ' + error.message );
            }           
        }
            
        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
            // If server returned an error response, try to parse it
            const errorText = await response.text();
            let errorMessage;
            let errorObj;
            try {
                // Try to parse as JSON
                errorObj = JSON.parse(errorText);
                errorMessage = errorObj.msg || `Ошибка ${response.status}`;
            } catch {
                // If not valid JSON, use text as is
                errorMessage = errorText || `Ошибка ${response.status}`;
            }

            const error = new Error(errorMessage);
            error.status = response.status;
            if (errorObj) error.data = errorObj;
            // Re-throw the error for further handling if needed
            throw error;
        }
        
        return response;
    };
}

/**
 * Downloads a file from the server and initiates browser download
 * @param {string} fileUrl - The URL to download from
 * @param {string} defaultFilename - Fallback filename if none provided in headers
 * @returns {Promise<boolean>} - True if download initiated successfully
 */
async function downloadFile(fileUrl, defaultFilename) {
  const response = await requestBlob('GET')(fileUrl)
  
  let filename = defaultFilename
  const disposition = response.headers.get('Content-Disposition')
  if (disposition && disposition.includes('filename=')) {
    filename = disposition
      .split('filename=')[1]
      .replace(/["']/g, '')
      .trim()
  }
  
  // Process the blob and trigger download
  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(objectUrl)
  return true
}

function handleResponse(response) {
  if (response.status == 204) {
    return Promise.resolve()
  }
  return response.text().then((text) => {
    try {
      const data = JSON.parse(text)
      if (enableLog) {
        console.log(response.status, response.statusText, data)
      }
      // Special handling: Do not treat HTTP 422 (Unprocessable Entity) as a generic error.
      // This allows the API to return validation errors in the response body, which the client can process and display to the user.
      // All other non-OK statuses (except 422) are treated as errors and will reject the promise.
      if (!response.ok && response.status !== 422) {
        const { user, logout } = useAuthStore()
        if ([401].includes(response.status)) {
          // auto logout if 401 Unauthorized response returned from api
          if (user) {
            logout()
          }
        }

        const error = (data && data.msg) || response.statusText
        return Promise.reject(error)
      }
      return data
    } catch {
      return Promise.reject(text)
    }
  })
}
