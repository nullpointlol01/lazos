import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, CheckCircle, TrendingUp, Eye, FileText } from 'lucide-react'

import { API_URL } from '@/config/api'

const REASON_LABELS = {
  not_animal: 'No es un animal',
  inappropriate: 'Contenido inapropiado',
  spam: 'Spam',
  other: 'Otro'
}

const ANIMAL_LABELS = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro'
}

const SIZE_LABELS = {
  small: 'Chico',
  medium: 'Mediano',
  large: 'Grande'
}

export default function Admin() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [processingIds, setProcessingIds] = useState(new Set())
  const [pendingPosts, setPendingPosts] = useState([])
  const [activeTab, setActiveTab] = useState('reports') // 'reports' or 'pending'

  // Check if already authenticated (from localStorage)
  useEffect(() => {
    const savedPassword = localStorage.getItem('admin_password')
    if (savedPassword) {
      setPassword(savedPassword)
      setIsAuthenticated(true)
    }
  }, [])

  // Fetch reports and stats when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchReports()
      fetchPendingPosts()
      fetchStats()
    }
  }, [isAuthenticated])

  const handleLogin = (e) => {
    e.preventDefault()
    if (password) {
      localStorage.setItem('admin_password', password)
      setIsAuthenticated(true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_password')
    setIsAuthenticated(false)
    setPassword('')
    setReports([])
    setStats(null)
  }

  const fetchReports = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/reports?resolved=false`, {
        headers: {
          'X-Admin-Password': password
        }
      })

      if (response.status === 401) {
        setError('Contraseña incorrecta')
        handleLogout()
        return
      }

      if (!response.ok) {
        throw new Error('Error al cargar reportes')
      }

      const data = await response.json()
      setReports(data.data || [])
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/stats`, {
        headers: {
          'X-Admin-Password': password
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchPendingPosts = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/pending`, {
        headers: {
          'X-Admin-Password': password
        }
      })

      if (response.status === 401) {
        setError('Contraseña incorrecta')
        handleLogout()
        return
      }

      if (!response.ok) {
        throw new Error('Error al cargar posts pendientes')
      }

      const data = await response.json()
      // Ensure data is always an array and filter out null elements
      const posts = (data?.data && Array.isArray(data.data))
        ? data.data.filter(post => post !== null && post !== undefined)
        : []
      setPendingPosts(posts)
    } catch (err) {
      console.error('Error fetching pending posts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePost = async (reportId, postId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
      return
    }

    setProcessingIds(prev => new Set([...prev, reportId]))

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Password': password
        }
      })

      if (!response.ok) {
        throw new Error('Error al eliminar post')
      }

      // Refresh reports and stats
      await fetchReports()
      await fetchStats()
    } catch (err) {
      console.error('Error deleting post:', err)
      alert('Error al eliminar la publicación: ' + err.message)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }

  const handleDeleteAlert = async (reportId, alertId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este aviso?')) {
      return
    }

    setProcessingIds(prev => new Set([...prev, reportId]))

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Password': password
        }
      })

      if (!response.ok) {
        throw new Error('Error al eliminar aviso')
      }

      // Refresh reports and stats
      await fetchReports()
      await fetchStats()
    } catch (err) {
      console.error('Error deleting alert:', err)
      alert('Error al eliminar el aviso: ' + err.message)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }

  const handleResolveReport = async (reportId) => {
    setProcessingIds(prev => new Set([...prev, reportId]))

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'X-Admin-Password': password
        }
      })

      if (!response.ok) {
        throw new Error('Error al resolver reporte')
      }

      // Refresh reports and stats
      await fetchReports()
      await fetchStats()
    } catch (err) {
      console.error('Error resolving report:', err)
      alert('Error al resolver el reporte: ' + err.message)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }

  const handleApprovePost = async (postId) => {
    if (processingIds.has(postId)) return

    setProcessingIds(prev => new Set(prev).add(postId))

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/pending/${postId}/approve`, {
        method: 'POST',
        headers: {
          'X-Admin-Password': password
        }
      })

      if (!response.ok) {
        throw new Error('Error al aprobar post')
      }

      // Refresh pending posts
      await fetchPendingPosts()
      await fetchStats()
    } catch (err) {
      console.error('Error approving post:', err)
      alert('Error al aprobar el post')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
    }
  }

  const handleRejectPost = async (postId, reason = '') => {
    if (processingIds.has(postId)) return

    const confirmed = window.confirm('¿Estás seguro de rechazar este post?')
    if (!confirmed) return

    setProcessingIds(prev => new Set(prev).add(postId))

    try {
      const url = reason
        ? `${API_URL}/api/v1/admin/pending/${postId}/reject?reason=${encodeURIComponent(reason)}`
        : `${API_URL}/api/v1/admin/pending/${postId}/reject`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Admin-Password': password
        }
      })

      if (!response.ok) {
        throw new Error('Error al rechazar post')
      }

      // Refresh pending posts
      await fetchPendingPosts()
      await fetchStats()
    } catch (err) {
      console.error('Error rejecting post:', err)
      alert('Error al rechazar el post')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
    }
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <AlertTriangle className="text-primary" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Panel Admin</h1>
            <p className="text-sm text-muted-foreground mt-2">Ingresa la contraseña de administrador</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Panel de Moderación</h1>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Reportes ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Pendientes ({pendingPosts.length})
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<FileText size={24} />}
              label="Posts Totales"
              value={stats.total_posts}
              bgColor="bg-primary/10"
              textColor="text-primary"
            />
            <StatCard
              icon={<Eye size={24} />}
              label="Posts Activos"
              value={stats.active_posts}
              bgColor="bg-green-100 dark:bg-green-900/30"
              textColor="text-green-600 dark:text-green-400"
            />
            <StatCard
              icon={<AlertTriangle size={24} />}
              label="Reportes Pendientes"
              value={stats.pending_reports}
              bgColor="bg-orange-100 dark:bg-orange-900/30"
              textColor="text-orange-600 dark:text-orange-400"
            />
            <StatCard
              icon={<TrendingUp size={24} />}
              label="Posts Reportados"
              value={stats.posts_with_reports}
              bgColor="bg-red-100"
              textColor="text-red-600 dark:text-red-400"
            />
          </div>
        )}

        {/* Reports List */}
        {activeTab === 'reports' && (
          <div className="bg-card rounded-lg shadow">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Reportes Pendientes ({reports.length})
                </h2>
                <button
                  onClick={fetchReports}
                  className="text-sm text-primary hover:text-primary"
                  disabled={loading}
                >
                  {loading ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-6 py-4 bg-destructive/10 border-b border-destructive/20">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {loading && reports.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground mt-4">Cargando reportes...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">¡Todo limpio!</p>
                <p className="text-sm text-muted-foreground mt-2">No hay reportes pendientes</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onDelete={() => {
                      if (report.post_id) {
                        handleDeletePost(report.id, report.post_id)
                      } else if (report.alert_id) {
                        handleDeleteAlert(report.id, report.alert_id)
                      }
                    }}
                    onResolve={() => handleResolveReport(report.id)}
                    isProcessing={processingIds.has(report.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Posts Section */}
        {activeTab === 'pending' && (
          <div className="bg-card rounded-lg shadow">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Posts Pendientes de Aprobación ({pendingPosts.length})
                </h2>
                <button
                  onClick={fetchPendingPosts}
                  className="text-sm text-primary hover:text-primary"
                  disabled={loading}
                >
                  {loading ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            {loading && pendingPosts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground mt-4">Cargando posts...</p>
              </div>
            ) : pendingPosts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">¡Todo aprobado!</p>
                <p className="text-sm text-muted-foreground mt-2">No hay posts pendientes de revisión</p>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-4">
                {pendingPosts.map((post) => {
                  // Guard clause: Si post es null o no tiene id, no renderizar nada
                  if (!post || !post.id) {
                    return null
                  }

                  return (
                    <div key={post.id} className="bg-muted/50 rounded-lg border border-border p-4">
                      <div className="flex gap-4">
                        {/* Image */}
                        {post.thumbnail_url && (
                          <img
                            src={post.thumbnail_url}
                            alt="Post"
                            className="w-32 h-32 object-cover rounded-md"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/128x128/e5e7eb/6b7280?text=Sin+imagen'
                            }}
                          />
                        )}

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-foreground">
                              {ANIMAL_LABELS[post.animal_type || 'other'] || post.animal_type || 'Desconocido'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              · {SIZE_LABELS[post.size || 'medium'] || post.size || 'Desconocido'}
                            </span>
                          </div>

                          {post.description && (
                            <p className="text-sm text-card-foreground mb-2 line-clamp-3">
                              {post.description}
                            </p>
                          )}

                          {post.location_name && (
                            <p className="text-sm text-muted-foreground mb-2">
                              📍 {post.location_name}
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground">
                            Subido el {new Date(post.created_at || new Date()).toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleApprovePost(post.id)}
                            disabled={processingIds.has(post.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {processingIds.has(post.id) ? 'Procesando...' : 'Aprobar'}
                          </button>
                          <button
                            onClick={() => handleRejectPost(post.id, 'Rechazado por moderador')}
                            disabled={processingIds.has(post.id)}
                            className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {processingIds.has(post.id) ? 'Procesando...' : 'Rechazar'}
                          </button>
                          <a
                            href={`/post/${post.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-muted hover:bg-muted/80 text-card-foreground rounded-md text-sm font-medium text-center transition-colors"
                          >
                            Ver detalle
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bgColor, textColor }) {
  return (
    <div className="bg-card rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`${bgColor} ${textColor} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function ReportCard({ report, onDelete, onResolve, isProcessing }) {
  const post = report.post
  const alert = report.alert
  const item = post || alert  // Usar el que exista
  const isAlert = !post && !!alert

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="px-6 py-4 hover:bg-muted/50 transition-colors">
      <div className="flex gap-4">
        {/* Thumbnail - solo para posts, alerts no tienen imagen */}
        {!isAlert && item?.thumbnail_url && (
          <div className="flex-shrink-0">
            <img
              src={item.thumbnail_url}
              alt="Post"
              className="w-24 h-24 object-cover rounded-lg"
              onError={(e) => {
                e.target.src = 'https://placehold.co/100x100/e5e7eb/6b7280?text=Error'
              }}
            />
          </div>
        )}

        {/* Report info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800">
                  {REASON_LABELS[report.reason]}
                </span>
                {item?.total_reports > 1 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800">
                    {item.total_reports} reportes
                  </span>
                )}
                {item?.is_active === false && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Eliminado
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {ANIMAL_LABELS[item?.animal_type || 'other']} {item?.size ? SIZE_LABELS[item.size] : ''} - {item?.location_name || 'Sin ubicación'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Reportado el {formatDate(report.created_at)}
              </p>
            </div>
          </div>

          {report.description && (
            <p className="text-sm text-card-foreground mb-3 bg-muted p-2 rounded">
              "{report.description}"
            </p>
          )}

          {item?.description && (
            <p className="text-sm text-muted-foreground mb-3">
              <span className="font-medium">Descripción {isAlert ? 'del aviso' : 'del post'}:</span> {item.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <a
              href={isAlert ? `/avisos/${item?.id}` : `/post/${item?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-3 py-1.5 bg-muted text-card-foreground rounded-md hover:bg-muted/80 transition-colors"
            >
              Ver {isAlert ? 'aviso' : 'post'}
            </a>
            <button
              onClick={onResolve}
              disabled={isProcessing || item?.is_active === false}
              className="text-sm px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <CheckCircle size={14} />
              Ignorar reporte
            </button>
            <button
              onClick={onDelete}
              disabled={isProcessing || item?.is_active === false}
              className="text-sm px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Trash2 size={14} />
              Eliminar {isAlert ? 'aviso' : 'post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
