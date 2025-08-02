/**
 * Brand Detector
 * Identifies which TrueFire Studios brand the user is asking about
 * Brands: TrueFire, ArtistWorks, Blayze, FaderPro, JamPlay
 */

export class BrandDetector {
  constructor() {
    this.brands = {
      truefire: {
        name: 'TrueFire',
        keywords: ['truefire', 'tf', 'guitar lessons', 'guitar courses'],
        domains: ['truefire.com']
      },
      artistworks: {
        name: 'ArtistWorks',
        keywords: ['artistworks', 'aw', 'video exchange', 'vxl'],
        domains: ['artistworks.com']
      },
      blayze: {
        name: 'Blayze',
        keywords: ['blayze', 'racing', 'motorsports', 'sports coaching'],
        domains: ['blayze.com']
      },
      faderpro: {
        name: 'FaderPro',
        keywords: ['faderpro', 'fp', 'dj', 'electronic music', 'production'],
        domains: ['faderpro.com']
      },
      jamplay: {
        name: 'JamPlay',
        keywords: ['jamplay', 'jp', 'jam play'],
        domains: ['jamplay.com']
      }
    };
    
    this.lastDetectedBrand = null;
  }
  
  /**
   * Detect brand from message and conversation history
   * @param {string} message - Current message
   * @param {Array} history - Conversation history
   * @returns {Promise<string|null>} - Detected brand name or null
   */
  async detectBrand(message, history = []) {
    // Check if brand is explicitly mentioned in current message
    const currentBrand = this.detectFromText(message);
    if (currentBrand) {
      this.lastDetectedBrand = currentBrand;
      return currentBrand;
    }
    
    // Check conversation history for context
    for (let i = history.length - 1; i >= 0; i--) {
      const historicalBrand = this.detectFromText(history[i].content);
      if (historicalBrand) {
        this.lastDetectedBrand = historicalBrand;
        return historicalBrand;
      }
    }
    
    // Return last detected brand if available
    return this.lastDetectedBrand;
  }
  
  /**
   * Detect brand from text content
   * @param {string} text - Text to analyze
   * @returns {string|null} - Detected brand name or null
   */
  detectFromText(text) {
    const lowerText = text.toLowerCase();
    
    for (const [key, brand] of Object.entries(this.brands)) {
      // Check for brand keywords
      for (const keyword of brand.keywords) {
        if (lowerText.includes(keyword)) {
          return brand.name;
        }
      }
      
      // Check for domain mentions
      for (const domain of brand.domains) {
        if (lowerText.includes(domain)) {
          return brand.name;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get brand information
   * @param {string} brandName - Brand name
   * @returns {Object|null} - Brand info or null
   */
  getBrandInfo(brandName) {
    for (const brand of Object.values(this.brands)) {
      if (brand.name === brandName) {
        return brand;
      }
    }
    return null;
  }
  
  /**
   * Get all brand names
   * @returns {Array<string>} - List of brand names
   */
  getAllBrands() {
    return Object.values(this.brands).map(b => b.name);
  }
  
  /**
   * Clear the last detected brand (useful for new conversations)
   */
  clearContext() {
    this.lastDetectedBrand = null;
  }
}
