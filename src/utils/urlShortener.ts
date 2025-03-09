import { deflate, inflate } from 'pako';

// Convert binary data to URL-safe base64
function toBase64URL(buffer: Uint8Array): string {
    const binary = Array.from(buffer).map(b => String.fromCharCode(b)).join('');
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Convert URL-safe base64 back to binary data
function fromBase64URL(base64: string): Uint8Array {
    try {
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        const base64Std = base64.replace(/-/g, '+').replace(/_/g, '/') + padding;
        const binaryStr = atob(base64Std);
        return Uint8Array.from(binaryStr, c => c.charCodeAt(0));
    } catch (e) {
        console.error('Error decoding base64:', e);
        throw new Error('Invalid URL format');
    }
}

// Field mapping for shorter keys
const fieldMap: Record<string, string> = {
    'entities': 'e',
    'relationships': 'r',
    'enumData': 'd',
    'sqlInput': 's',
    'id': 'i',
    'name': 'n',
    'attributes': 'a',
    'position': 'p',
    'x': 'x',
    'y': 'y',
    'from': 'f',
    'to': 't',
    'entityId': 'ei',
    'attributeIndex': 'ai',
    'type': 'ty'
};

// Reverse field mapping for decompression
const reverseFieldMap: Record<string, string> = 
    Object.entries(fieldMap).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {} as Record<string, string>);

// Optimize data structure by using shorter field names
function optimizeDataStructure(data: any): any {
    if (Array.isArray(data)) {
        return data.map(optimizeDataStructure);
    }
    
    if (data !== null && typeof data === 'object') {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            const shorterKey = fieldMap[key] || key;
            result[shorterKey] = optimizeDataStructure(value);
        }
        return result;
    }
    
    return data;
}

// Restore original field names
function restoreDataStructure(data: any): any {
    if (Array.isArray(data)) {
        return data.map(restoreDataStructure);
    }
    
    if (data !== null && typeof data === 'object') {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            const originalKey = reverseFieldMap[key] || key;
            result[originalKey] = restoreDataStructure(value);
        }
        return result;
    }
    
    return data;
}

export function compressData(data: any): string {
    try {
        
        const optimizedData = optimizeDataStructure(data);
        
        
        const jsonStr = JSON.stringify(optimizedData);
        
        // Use maximum compression level
        const compressed = deflate(jsonStr, { level: 9 });
        
        
        return toBase64URL(compressed);
    } catch (error) {
        console.error('Error compressing data:', error);
        
        const jsonStr = JSON.stringify(data);
        const compressed = deflate(jsonStr, { level: 9 });
        return toBase64URL(compressed);
    }
}

export function decompressData(compressed: string): any {
    try {
        
        const binaryData = fromBase64URL(compressed);
        
        
        const decompressed = inflate(binaryData, { to: 'string' });
        
        
        const parsedData = JSON.parse(decompressed);
        
        
        return restoreDataStructure(parsedData);
    } catch (error) {
        console.error('Error decompressing data:', error);
        
        
        try {
            const binaryData = fromBase64URL(compressed);
            const decompressed = inflate(binaryData, { to: 'string' });
            return JSON.parse(decompressed);
        } catch (fallbackError) {
            console.error('Fallback decompression also failed:', fallbackError);
            throw new Error('The shared diagram data is invalid or corrupted.');
        }
    }
}

// Helper function to calculate compression ratio
export function getCompressionInfo(data: any): { 
    original: number, 
    compressed: number, 
    ratio: number 
} {
    const jsonStr = JSON.stringify(data);
    const originalLength = jsonStr.length;
    
    const optimizedData = optimizeDataStructure(data);
    const optimizedJsonStr = JSON.stringify(optimizedData);
    
    const compressed = deflate(optimizedJsonStr, { level: 9 });
    const compressedBase64 = toBase64URL(compressed);
    
    return {
        original: originalLength,
        compressed: compressedBase64.length,
        ratio: Math.round((compressedBase64.length / originalLength) * 100)
    };
} 