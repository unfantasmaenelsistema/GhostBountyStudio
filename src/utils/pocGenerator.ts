/**
 * HTTP Request/Response parser and PoC code generator for Python (requests) and cURL.
 * Supports Burp Suite raw pastes, handles headers, cookies, query parameters, and JSON/Form payloads.
 */

export interface ParsedHttpRequest {
  method: string;
  url: string;
  path: string;
  host: string;
  protocol: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body: string;
  contentType: string;
  isJson: boolean;
  isFormData: boolean;
}

/**
 * Splits raw HTTP into request and optional response sections if both were pasted
 */
export function splitHttpExchange(rawText: string): { requestRaw: string; responseRaw: string } {
  if (!rawText) return { requestRaw: '', responseRaw: '' };

  // Look for HTTP response line like "HTTP/1.1 200 OK" or "HTTP/2 200"
  const responseMatch = rawText.match(/\r?\n\r?\n(HTTP\/(?:1\.[01]|2|3)\s+\d{3}.*)/s);
  if (responseMatch && responseMatch.index !== undefined) {
    const requestRaw = rawText.substring(0, responseMatch.index).trim();
    const responseRaw = responseMatch[1].trim();
    return { requestRaw, responseRaw };
  }

  // If the text starts with HTTP response, return as response
  if (/^HTTP\/(?:1\.[01]|2|3)\s+\d{3}/i.test(rawText.trim())) {
    return { requestRaw: '', responseRaw: rawText.trim() };
  }

  return { requestRaw: rawText.trim(), responseRaw: '' };
}

/**
 * Parses raw HTTP request text into structured components
 */
export function parseRawHttpRequest(rawHttp: string, defaultHost = 'api.target.com'): ParsedHttpRequest {
  const { requestRaw } = splitHttpExchange(rawHttp);
  const text = requestRaw || rawHttp;

  const lines = text.split(/\r?\n/);
  let method = 'GET';
  let path = '/';
  let protocol = 'https';
  const headers: Record<string, string> = {};
  const cookies: Record<string, string> = {};
  let bodyLines: string[] = [];
  let isBody = false;

  if (lines.length > 0 && lines[0].trim()) {
    const firstLine = lines[0].trim();
    const reqLineMatch = firstLine.match(/^([A-Z]+)\s+([^\s]+)(?:\s+HTTP\/[\d.]+)?$/i);
    if (reqLineMatch) {
      method = reqLineMatch[1].toUpperCase();
      path = reqLineMatch[2];
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (!isBody) {
      if (line.trim() === '') {
        isBody = true;
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const headerName = line.slice(0, colonIdx).trim();
        const headerValue = line.slice(colonIdx + 1).trim();
        headers[headerName] = headerValue;

        if (headerName.toLowerCase() === 'cookie') {
          // Parse cookies
          const cookiePairs = headerValue.split(';');
          for (const cp of cookiePairs) {
            const eqIdx = cp.indexOf('=');
            if (eqIdx > 0) {
              const k = cp.slice(0, eqIdx).trim();
              const v = cp.slice(eqIdx + 1).trim();
              if (k) cookies[k] = v;
            }
          }
        }
      }
    } else {
      bodyLines.push(line);
    }
  }

  const rawBody = bodyLines.join('\n').trim();

  // Determine host
  const hostHeader = Object.keys(headers).find((k) => k.toLowerCase() === 'host');
  const host = hostHeader ? headers[hostHeader] : defaultHost;

  // Determine full URL
  let url = path;
  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    url = `${protocol}://${host}${path.startsWith('/') ? path : '/' + path}`;
  } else {
    try {
      const parsedUrl = new URL(path);
      protocol = parsedUrl.protocol.replace(':', '');
    } catch {
      // Keep as-is
    }
  }

  const contentType =
    headers[Object.keys(headers).find((k) => k.toLowerCase() === 'content-type') || ''] || '';
  const isJson = contentType.toLowerCase().includes('application/json');
  const isFormData = contentType.toLowerCase().includes('application/x-www-form-urlencoded');

  return {
    method,
    url,
    path,
    host,
    protocol,
    headers,
    cookies,
    body: rawBody,
    contentType,
    isJson,
    isFormData,
  };
}

/**
 * Generates an executable Python script using `requests` with session, error handling,
 * response validation, and pretty printing.
 */
export function generatePythonPoC(parsed: ParsedHttpRequest, options?: { description?: string }): string {
  const desc = options?.description || 'Proof of Concept exploit script';
  const headersToKeep = { ...parsed.headers };

  // Filter out host and content-length as requests sets them
  delete headersToKeep[Object.keys(headersToKeep).find((k) => k.toLowerCase() === 'host') || ''];
  delete headersToKeep[Object.keys(headersToKeep).find((k) => k.toLowerCase() === 'content-length') || ''];

  let formattedHeaders = 'headers = {\n';
  const headerKeys = Object.keys(headersToKeep);
  if (headerKeys.length === 0) {
    formattedHeaders = 'headers = {}\n';
  } else {
    for (const key of headerKeys) {
      formattedHeaders += `    "${escapePython(key)}": "${escapePython(headersToKeep[key])}",\n`;
    }
    formattedHeaders += '}\n';
  }

  let bodySection = '';
  let requestArg = '';

  if (parsed.body) {
    if (parsed.isJson) {
      try {
        const parsedJson = JSON.parse(parsed.body);
        bodySection = `payload = ${JSON.stringify(parsedJson, null, 4)}\n`;
        requestArg = ', json=payload';
      } catch {
        bodySection = `payload = """${parsed.body.replace(/"""/g, '\\"\\"\\"')}"""\n`;
        requestArg = ', data=payload';
      }
    } else if (parsed.isFormData) {
      bodySection = `data = """${parsed.body.replace(/"""/g, '\\"\\"\\"')}"""\n`;
      requestArg = ', data=data';
    } else {
      bodySection = `payload = """${parsed.body.replace(/"""/g, '\\"\\"\\"')}"""\n`;
      requestArg = ', data=payload';
    }
  }

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
  UN FANTASMA EN EL SISTEMA - Bug Bounty Proof of Concept (PoC)
  https://www.unfantasmaenelsistema.com/
  
  Objetivo / Descripcion: ${desc}
  Metodo: ${parsed.method}
  URL: ${parsed.url}
=============================================================================
"""

import sys
import json
import urllib3
import requests

# Deshabilitar advertencias de certificados auto-firmados en proxies (Burp/ZAP)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TARGET_URL = "${escapePython(parsed.url)}"

${formattedHeaders}
${bodySection}
def run_exploit():
    print("[*] Iniciando prueba de concepto de vulnerabilidad...")
    print(f"[*] Destino: {TARGET_URL}")
    print(f"[*] Metodo: ${parsed.method}")
    
    session = requests.Session()
    
    # Configurar proxy opcional (descomentar para auditar trafico en Burp Suite)
    # session.proxies = {"http": "http://127.0.0.1:8080", "https": "http://127.0.0.1:8080"}
    
    try:
        response = session.request(
            method="${parsed.method}",
            url=TARGET_URL,
            headers=headers${requestArg},
            timeout=15,
            verify=False,
            allow_redirects=False
        )
        
        print(f"[+] Estado HTTP recibido: {response.status_code} ({response.reason})")
        print(f"[+] Tamano de respuesta: {len(response.content)} bytes")
        
        print("\\n" + "="*50 + " CABECERAS DE RESPUESTA " + "="*50)
        for h_name, h_val in response.headers.items():
            print(f"  {h_name}: {h_val}")
            
        print("\\n" + "="*50 + " CUERPO DE RESPUESTA " + "="*50)
        try:
            # Intento de formateo JSON
            json_data = response.json()
            print(json.dumps(json_data, indent=2, ensure_ascii=False))
        except Exception:
            # Texto plano o HTML
            print(response.text[:3000] + ("\\n... [recortado]" if len(response.text) > 3000 else ""))
            
        # Evaluacion basica del impacto
        if response.status_code in (200, 201, 204):
            print("\\n[!] EXITO: El endpoint respondio positivamente a la peticion.")
            return True
        else:
            print(f"\\n[-] El servidor devolvio codigo {response.status_code}.")
            return False

    except requests.exceptions.RequestException as err:
        print(f"[!] Error de conexion: {err}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = run_exploit()
    sys.exit(0 if success else 1)
`;
}

/**
 * Generates an accurate, single or multi-line cURL command ready for bash execution.
 */
export function generateCurlCommand(parsed: ParsedHttpRequest, options?: { singleLine?: boolean }): string {
  const single = options?.singleLine ?? false;
  const sep = single ? ' ' : ' \\\n  ';

  let cmd = `curl -i -s -k -X ${parsed.method} "${parsed.url}"`;

  // Headers
  for (const [header, val] of Object.entries(parsed.headers)) {
    if (header.toLowerCase() === 'host' || header.toLowerCase() === 'content-length') continue;
    cmd += `${sep}-H "${escapeShell(header)}: ${escapeShell(val)}"`;
  }

  // Body
  if (parsed.body) {
    if (parsed.isJson) {
      // Compress body if single-line
      const sanitizedBody = single ? parsed.body.replace(/\s+/g, ' ') : parsed.body;
      cmd += `${sep}--data-raw '${sanitizedBody.replace(/'/g, "'\\''")}'`;
    } else {
      cmd += `${sep}--data '${parsed.body.replace(/'/g, "'\\''")}'`;
    }
  }

  return cmd;
}

function escapePython(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function escapeShell(str: string): string {
  return str.replace(/"/g, '\\"');
}
