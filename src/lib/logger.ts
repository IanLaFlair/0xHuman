/**
 * Logger utility that respects MODE environment variable.
 * In production (MODE !== 'DEV'), console.log is suppressed.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.log('message'); // Only shows in DEV mode
 *   logger.error('error'); // Always shows (errors are important)
 *   logger.warn('warning'); // Always shows (warnings are important)
 */

const isDev = process.env.MODE === 'DEV' || process.env.NODE_ENV === 'development';

export const logger = {
    log: (...args: any[]) => {
        if (isDev) {
            console.log(...args);
        }
    },

    info: (...args: any[]) => {
        if (isDev) {
            console.info(...args);
        }
    },

    debug: (...args: any[]) => {
        if (isDev) {
            console.debug(...args);
        }
    },

    // Errors and warnings always show (important for debugging issues)
    error: (...args: any[]) => {
        console.error(...args);
    },

    warn: (...args: any[]) => {
        console.warn(...args);
    },
};

// Also override global console.log in client-side if not DEV
if (typeof window !== 'undefined' && !isDev) {
    const noop = () => { };
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    // Keep console.error and console.warn for debugging critical issues
}

export default logger;
