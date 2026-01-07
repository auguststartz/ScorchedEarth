// Input validation utility

export class Validator {
  static validatePlayerName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Player name is required' };
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return { valid: false, error: 'Player name must be at least 3 characters' };
    }

    if (trimmedName.length > 16) {
      return { valid: false, error: 'Player name must be at most 16 characters' };
    }

    // Allow alphanumeric, spaces, and basic punctuation
    const nameRegex = /^[a-zA-Z0-9 _-]+$/;
    if (!nameRegex.test(trimmedName)) {
      return { valid: false, error: 'Player name contains invalid characters' };
    }

    return { valid: true };
  }

  static validateAngle(angle: number): { valid: boolean; error?: string } {
    if (typeof angle !== 'number' || isNaN(angle)) {
      return { valid: false, error: 'Angle must be a number' };
    }

    if (angle < 0 || angle > 180) {
      return { valid: false, error: 'Angle must be between 0 and 180' };
    }

    return { valid: true };
  }

  static validatePower(power: number): { valid: boolean; error?: string } {
    if (typeof power !== 'number' || isNaN(power)) {
      return { valid: false, error: 'Power must be a number' };
    }

    if (power < 0 || power > 100) {
      return { valid: false, error: 'Power must be between 0 and 100' };
    }

    return { valid: true };
  }

  static validateWeapon(weapon: string): { valid: boolean; error?: string } {
    const validWeapons = ['standard', 'heavy', 'cluster', 'mirv', 'digger', 'napalm'];

    if (!weapon || typeof weapon !== 'string') {
      return { valid: false, error: 'Weapon type is required' };
    }

    if (!validWeapons.includes(weapon)) {
      return { valid: false, error: 'Invalid weapon type' };
    }

    return { valid: true };
  }

  static validateChatMessage(message: string): { valid: boolean; error?: string } {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Message is required' };
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (trimmedMessage.length > 200) {
      return { valid: false, error: 'Message must be at most 200 characters' };
    }

    return { valid: true };
  }

  static sanitizeChatMessage(message: string): string {
    // Basic XSS protection - remove HTML tags
    return message
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
