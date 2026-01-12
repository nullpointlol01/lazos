import { useState, useCallback, useRef } from 'react'
import * as nsfwjs from 'nsfwjs'

/**
 * Hook for AI-powered content validation using NSFW.js
 *
 * Validates images for inappropriate content before submission.
 * Model is loaded lazily on first use to optimize performance.
 */
export function useContentValidation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const modelRef = useRef(null)

  /**
   * Load NSFW.js model (cached after first load)
   */
  const loadModel = useCallback(async () => {
    if (modelRef.current) {
      return modelRef.current
    }

    try {
      const model = await nsfwjs.load()
      modelRef.current = model
      return model
    } catch (err) {
      console.error('[useContentValidation] Error loading model:', err)
      throw new Error('No se pudo cargar el modelo de validación')
    }
  }, [])

  /**
   * Validate a single image for NSFW content
   *
   * @param {File|string} image - Image file or URL
   * @returns {Promise<{safe: boolean, reason: string|null, shouldModerate: boolean}>}
   */
  const validateImage = useCallback(async (image) => {
    try {
      setLoading(true)
      setError(null)

      const model = await loadModel()

      // Create image element
      const img = document.createElement('img')

      // Load image
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject

        if (image instanceof File) {
          img.src = URL.createObjectURL(image)
        } else {
          img.src = image
        }
      })

      // Classify image
      const predictions = await model.classify(img)

      // Clean up object URL if created
      if (image instanceof File) {
        URL.revokeObjectURL(img.src)
      }

      // Check for NSFW content
      const nsfwCategories = ['Porn', 'Sexy', 'Hentai']
      const nsfwPrediction = predictions.find(p =>
        nsfwCategories.includes(p.className) && p.probability > 0.6
      )

      // Check for borderline content that needs manual review
      const bordelinePrediction = predictions.find(p =>
        nsfwCategories.includes(p.className) && p.probability > 0.3 && p.probability <= 0.6
      )

      if (nsfwPrediction) {
        return {
          safe: false,
          reason: 'La imagen contiene contenido inapropiado y no puede ser publicada',
          shouldModerate: false
        }
      }

      if (bordelinePrediction) {
        return {
          safe: true,
          reason: 'La imagen será revisada por un moderador antes de publicarse',
          shouldModerate: true
        }
      }

      return {
        safe: true,
        reason: null,
        shouldModerate: false
      }

    } catch (err) {
      console.error('[useContentValidation] Error validating image:', err)
      setError(err.message)

      // In case of error, allow the image but flag for moderation
      return {
        safe: true,
        reason: 'No se pudo validar la imagen, será revisada por un moderador',
        shouldModerate: true
      }
    } finally {
      setLoading(false)
    }
  }, [loadModel])

  /**
   * Validate multiple images
   *
   * @param {File[]|string[]} images - Array of image files or URLs
   * @returns {Promise<{safe: boolean, reason: string|null, shouldModerate: boolean}>}
   */
  const validateImages = useCallback(async (images) => {
    if (!images || images.length === 0) {
      return { safe: true, reason: null, shouldModerate: false }
    }

    try {
      setLoading(true)
      setError(null)

      // Validate all images
      const results = await Promise.all(
        images.map(image => validateImage(image))
      )

      // If any image is unsafe, reject all
      const unsafeImage = results.find(r => !r.safe)
      if (unsafeImage) {
        return unsafeImage
      }

      // If any image needs moderation, flag all for moderation
      const needsModeration = results.some(r => r.shouldModerate)
      if (needsModeration) {
        return {
          safe: true,
          reason: 'Las imágenes serán revisadas por un moderador antes de publicarse',
          shouldModerate: true
        }
      }

      return {
        safe: true,
        reason: null,
        shouldModerate: false
      }

    } catch (err) {
      console.error('[useContentValidation] Error validating images:', err)
      setError(err.message)

      return {
        safe: true,
        reason: 'No se pudo validar las imágenes, serán revisadas por un moderador',
        shouldModerate: true
      }
    } finally {
      setLoading(false)
    }
  }, [validateImage])

  return {
    validateImage,
    validateImages,
    loading,
    error
  }
}
