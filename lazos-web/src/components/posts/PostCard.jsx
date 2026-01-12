import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Image, Camera } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

// Iconos de sexo
const SexIcon = ({ sex }) => {
  if (sex === 'male') return <span className="text-blue-500 font-bold">♂</span>
  if (sex === 'female') return <span className="text-pink-500 font-bold">♀</span>
  return <span className="text-muted-foreground font-bold">?</span>
}

// Labels en español
const sizeLabels = {
  small: 'Chico',
  medium: 'Mediano',
  large: 'Grande',
}

const animalLabels = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro',
}

export default function PostCard({ post, onClick }) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  // Verificar si el texto necesita "Leer más" (más de 2 líneas, ~80 caracteres)
  const needsReadMore = post.description && post.description.length > 80

  // Truncar descripción a 2 líneas (~80 caracteres)
  const truncateText = (text, maxLength = 80) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  // Manejar click en la card
  const handleClick = (e) => {
    // Si se hace click en "Leer más/menos", no navegar
    if (e.target.closest('.read-more-toggle')) {
      return
    }
    if (onClick) {
      onClick(post)
    }
    navigate(`/post/${post.id}`)
  }

  // Toggle de expandir descripción
  const toggleExpand = (e) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return date.toLocaleDateString('es-AR')
  }

  // Handle image load success
  const handleImageLoad = (postId, thumbnailUrl) => {
    console.log('[PostCard] Imagen cargada exitosamente:', thumbnailUrl)
  }

  // Handle image error
  const handleImageError = (e, postId, thumbnailUrl) => {
    console.error(`[PostCard] Error cargando imagen para post ${postId}`)
    console.error(`[PostCard] URL fallida: ${thumbnailUrl}`)
    console.error('[PostCard] Posibles causas:')
    console.error('  1. El bucket R2 no está configurado como público')
    console.error('  2. La URL de R2 tiene permisos incorrectos')
    console.error('  3. CORS no configurado en R2')
    e.target.src = 'https://placehold.co/400x400/e5e7eb/6b7280?text=Sin+imagen'
  }

  // Contar imágenes (compatible con formato nuevo y antiguo)
  const imageCount = post.image_count || post.images?.length || 1

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200"
      onClick={handleClick}
    >
      {/* Imagen */}
      <div className="relative aspect-square bg-muted">
        <img
          src={post.thumbnail_url}
          alt={`${animalLabels[post.animal_type]} ${sizeLabels[post.size]}`}
          className="w-full h-full object-cover"
          onLoad={() => handleImageLoad(post.id, post.thumbnail_url)}
          onError={(e) => handleImageError(e, post.id, post.thumbnail_url)}
          loading="lazy"
        />

        {/* Indicador de múltiples imágenes */}
        {imageCount > 1 && (
          <div className="absolute top-2 right-2 bg-background/80 dark:bg-black/80 text-foreground px-2 py-1 rounded-full text-xs flex items-center gap-1 backdrop-blur-sm font-medium">
            <Camera size={14} />
            <span>{imageCount}</span>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        {/* Tipo de animal y Tamaño */}
        <div className="flex items-center gap-2 mb-1">
          <SexIcon sex={post.sex} />
          <span className="text-sm font-bold text-foreground">
            {animalLabels[post.animal_type]}
          </span>
          <span className="text-sm text-muted-foreground">
            · {sizeLabels[post.size]}
          </span>
        </div>

        {/* Ubicación */}
        {post.location_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <MapPin size={12} />
            <span className="truncate">{post.location_name}</span>
          </div>
        )}

        {/* Descripción */}
        {post.description && (
          <div className="text-sm text-foreground/80 mb-2">
            <p className={needsReadMore && !isExpanded ? 'line-clamp-2' : ''}>
              {isExpanded || !needsReadMore ? post.description : truncateText(post.description)}
            </p>
            {needsReadMore && (
              <button
                onClick={toggleExpand}
                className="read-more-toggle text-primary hover:underline text-xs mt-1 font-medium"
              >
                {isExpanded ? 'Leer menos' : 'Leer más'}
              </button>
            )}
          </div>
        )}

        {/* Fecha */}
        <p className="text-xs text-muted-foreground">
          {formatDate(post.sighting_date)}
        </p>
      </CardContent>
    </Card>
  )
}
