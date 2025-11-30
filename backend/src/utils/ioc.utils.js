const detectType = (value) => {
    value = value.trim();

    // IP address pattern
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipPattern.test(value)) return 'ip';

    // Hash patterns
    if (/^[a-fA-F0-9]{32}$/.test(value)) return 'md5';
    if (/^[a-fA-F0-9]{40}$/.test(value)) return 'sha1';
    if (/^[a-fA-F0-9]{64}$/.test(value)) return 'sha256';

    // URL pattern
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('ftp://')) return 'url';

    // Domain pattern (simple check)
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    if (domainPattern.test(value) && value.includes('.')) return 'domain';

    return 'unknown';
};

const IOC_TYPES = ['ip', 'domain', 'url', 'sha256', 'md5', 'sha1'];
const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];

const validateIocData = (data) => {
    if (!data) return { error: 'No data provided' };

    let value = (data.value || '').trim();
    let type = (data.type || '').toLowerCase();

    if (!value) return { error: 'IOC value is required' };

    if (!type) {
        type = detectType(value);
    }

    if (!IOC_TYPES.includes(type)) {
        return { error: `Invalid IOC type. Must be one of: ${IOC_TYPES.join(', ')}` };
    }

    if (type === 'unknown') {
        return { error: 'Could not determine IOC type from value' };
    }

    return { type, value };
};

module.exports = {
    detectType,
    validateIocData,
    IOC_TYPES,
    SEVERITIES,
};
