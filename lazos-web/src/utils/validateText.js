/**
 * Text validation utilities for spam and inappropriate content detection
 */

/**
 * Validate text content for quality and appropriateness
 *
 * @param {string} text - Text to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateText(text) {
  const result = {
    valid: true,
    errors: []
  }

  if (!text) {
    return result
  }

  const trimmedText = text.trim()

  // 1. Minimum length check
  if (trimmedText.length < 10) {
    result.errors.push('La descripción debe tener al menos 10 caracteres')
  }

  // 2. Must contain letters (not just emojis or symbols)
  const hasLetters = /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(trimmedText)
  if (!hasLetters) {
    result.errors.push('La descripción debe contener texto, no solo emojis o símbolos')
  }

  // 3. Detect spam (repetitive words)
  const words = trimmedText.toLowerCase().split(/\s+/)
  const uniqueWords = new Set(words)
  const repetitionRatio = uniqueWords.size / words.length

  if (words.length >= 3 && repetitionRatio < 0.4) {
    result.errors.push('El texto parece ser spam (demasiadas palabras repetidas)')
  }

  // 4. Detect nonsense words (random typing patterns)
  const hasNonsenseWords = words.some(word => {
    if (word.length < 4) return false

    // Detect repetition of short patterns (asdasd, qweqwe, abcabc)
    const chars = word.toLowerCase().split('')
    const uniqueChars = new Set(chars)

    // If more than 60% of characters are repeated, it's suspicious
    if (uniqueChars.size / chars.length < 0.4) {
      return true
    }

    // Detect lack of vowels (unpronounceable words)
    const vowels = chars.filter(c => 'aeiouáéíóú'.includes(c))
    if (word.length > 5 && vowels.length / chars.length < 0.2) {
      return true
    }

    return false
  })

  if (hasNonsenseWords) {
    result.errors.push('El texto parece contener palabras sin sentido')
  }

  // 5. Detect similar/repetitive words (asdasd, asdasdsad, asdasdasd)
  const similarWords = words.filter((word, i) => {
    return words.some((other, j) => {
      if (i === j || word.length < 4 || other.length < 4) return false
      // If one word contains the other or they share most characters
      return word.includes(other) || other.includes(word)
    })
  })

  if (words.length >= 3 && similarWords.length / words.length > 0.5) {
    result.errors.push('El texto contiene demasiadas palabras similares')
  }

  // 6. Suspicious URLs (allow normal URLs but detect spam patterns)
  const urlPattern = /(https?:\/\/[^\s]+)/gi
  const urls = trimmedText.match(urlPattern) || []

  if (urls.length > 3) {
    result.errors.push('Demasiados enlaces en la descripción')
  }

  // 7. Excessive capitalization (more than 50% uppercase)
  const uppercaseChars = (trimmedText.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length
  const totalLetters = (trimmedText.match(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/g) || []).length

  if (totalLetters > 0 && uppercaseChars / totalLetters > 0.5) {
    result.errors.push('Evitá usar MAYÚSCULAS en exceso')
  }

  // 8. Offensive words (basic filter for Spanish)
  const offensiveWords = [
    'puto', 'puta', 'idiota', 'estupido', 'estúpido', 'imbecil', 'imbécil',
    'mierda', 'carajo', 'pendejo', 'boludo', 'pelotudo', 'gil'
  ]

  const lowerText = trimmedText.toLowerCase()
  const foundOffensive = offensiveWords.find(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lowerText)
  })

  if (foundOffensive) {
    result.errors.push('La descripción contiene lenguaje inapropiado')
  }

  // 9. Phone numbers in description (security risk)
  const phonePattern = /(\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g
  const hasPhoneNumber = phonePattern.test(trimmedText)

  if (hasPhoneNumber) {
    result.errors.push('No incluyas números de teléfono en la descripción. Usá el campo de contacto')
  }

  result.valid = result.errors.length === 0

  return result
}

/**
 * Sanitize text by removing HTML, scripts, and normalizing whitespace
 *
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (!text) {
    return ''
  }

  // Remove HTML tags and scripts
  let sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  sanitized = sanitized.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  const textarea = document.createElement('textarea')
  textarea.innerHTML = sanitized
  sanitized = textarea.value

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // Remove zero-width characters and other invisible characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '')

  return sanitized
}

/**
 * Check if text appears to be a personal contact (email, phone, social media)
 * This is a helper for determining if contact info is in wrong field
 *
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export function containsContactInfo(text) {
  if (!text) {
    return false
  }

  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const phonePattern = /(\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/
  const socialPattern = /@[\w.]+|facebook\.com|instagram\.com|twitter\.com|whatsapp/i

  return emailPattern.test(text) || phonePattern.test(text) || socialPattern.test(text)
}
