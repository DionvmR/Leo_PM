/**
 * Configuration Manager
 * Handles all configuration settings for Leo Agent
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Config {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config', 'settings.json');
    this.settings = this.loadSettings();
  }
  
  /**
   * Load settings from file or create default
   */
  loadSettings() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load settings.json, using defaults');
    }
    
    // Default settings
    return {
      llm: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7
      },
      brands: {
        default: null,
        detectFromMessage: true
      },
      mcp: {
        enabled: true,
        servers: {
          jira: { enabled: true },
          confluence: { enabled: true },
          googleDrive: { enabled: true },
          github: { enabled: true },
          intercom: { enabled: true }
        }
      },
      logging: {
        level: 'info',
        file: 'leo-agent.log'
      }
    };
  }
  
  /**
   * Get a configuration value using dot notation
   * @param {string} key - Configuration key (e.g., 'llm.provider')
   * @returns {any} - Configuration value
   */
  get(key) {
    const keys = key.split('.');
    let value = this.settings;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * Set a configuration value using dot notation
   * @param {string} key - Configuration key
   * @param {any} value - Value to set
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this.settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
    this.save();
  }
  
  /**
   * Save settings to file
   */
  save() {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.settings, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
  
  /**
   * Reset to default settings
   */
  reset() {
    this.settings = this.loadSettings();
    this.save();
  }
  
  /**
   * Get all settings
   * @returns {Object} - All settings
   */
  getAll() {
    return { ...this.settings };
  }
}

// Export singleton instance
export const config = new Config();
