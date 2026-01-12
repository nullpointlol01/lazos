import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react'
import ReportModal from '@/components/ReportModal'

import { API_URL } from '@/config/api'

// Iconos de sexo
const SexIcon = ({ sex }) => {
  if (sex === 'male') return <span className="text-blue-500 font-bold text-xl">♂</span>
  if (sex === 'female') return <span className="text-pink-500 font-bold text-xl">♀</span>
  return <span className="text-muted-foreground font-bold text-xl">?</span>
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

const sexLabels = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'Desconocido',
}

// Componente Carousel
function ImageCarousel({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  // Mínima distancia para swipe (en px)
  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleImageError = (e, imageUrl) => {
    console.error('[PostDetail] Error cargando imagen:', imageUrl)
    e.target.src = 'https://placehold.co/800x800/e5e7eb/6b7280?text=Sin+imagen'
  }

  if (!images || images.length === 0) {
    return (
      <div className="relative w-full aspect-square bg-muted flex items-center justify-center">
        <span className="text-muted-foreground">Sin imágenes</span>
      </div>
    )
  }

  return (
    <div className="relative w-full aspect-square bg-black">
      {/* Imagen actual */}
      <img
        src={images[currentIndex].image_url}
        alt={`Imagen ${currentIndex + 1} de ${images.length}`}
        className="w-full h-full object-contain"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onError={(e) => handleImageError(e, images[currentIndex].image_url)}
      />

      {/* Botones de navegación (desktop) */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={goToPrev}
            >
              <ChevronLeft size={24} />
            </Button>
          )}

          {currentIndex < images.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={goToNext}
            >
              <ChevronRight size={24} />
            </Button>
          )}
        </>
      )}

      {/* Indicador de posición */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50'
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}

      {/* Contador */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1}/{images.length}
        </div>
      )}
    </div>
  )
}

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)

  useEffect(() => {
    const fetchPostDetail = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${API_URL}/api/v1/posts/${id}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Publicación no encontrada')
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setPost(data)
      } catch (err) {
        console.error('Error fetching post detail:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPostDetail()
  }, [id])

  // Formatear fecha completa
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-muted aspect-square rounded-lg mb-4"></div>
            <div className="bg-muted h-8 rounded mb-4"></div>
            <div className="bg-muted h-20 rounded mb-4"></div>
            <div className="bg-muted h-32 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver
          </Button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium mb-2">{error}</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Ir al inicio
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header con botón volver y reportar */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReportModal(true)}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <AlertTriangle size={18} className="mr-2" />
            Reportar
          </Button>
        </div>

        <Card className="overflow-hidden">
          {/* Carousel de imágenes */}
          <ImageCarousel images={post.images || []} />

          <CardContent className="p-6">
            {/* Tipo de animal y características */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <SexIcon sex={post.sex} />
                <span className="text-lg font-semibold">
                  {animalLabels[post.animal_type]}
                </span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-card-foreground">
                {sizeLabels[post.size]}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {sexLabels[post.sex]}
              </span>
            </div>

            {/* Ubicación */}
            {post.location_name && (
              <div className="flex items-start gap-2 mb-4 p-3 bg-muted rounded-lg">
                <MapPin size={20} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Ubicación</p>
                  <p className="text-sm text-card-foreground">{post.location_name}</p>
                </div>
              </div>
            )}

            {/* Fecha de avistamiento */}
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-foreground mb-1">
                Fecha de avistamiento
              </p>
              <p className="text-sm text-card-foreground">
                {formatDate(post.sighting_date)}
              </p>
            </div>

            {/* Descripción */}
            {post.description && (
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  Descripción
                </p>
                <p className="text-card-foreground whitespace-pre-wrap">
                  {post.description}
                </p>
              </div>
            )}

            {/* Información de contacto */}
            {post.contact_method && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm font-medium text-primary mb-1">
                  Contacto
                </p>
                <p className="text-sm text-primary">
                  {post.contact_method}
                </p>
              </div>
            )}

            {/* Fecha de publicación */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-muted-foreground">
                Publicado el {formatDate(post.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Report Modal */}
        <ReportModal
          postId={id}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      </div>
    </div>
  )
}
